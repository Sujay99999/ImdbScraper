const axios = require("axios");
const jsdom = require("jsdom");
const path = require("path");
const fs = require("fs");
const util = require("util");

const { JSDOM } = jsdom;

// let movieArr = [];

const movieDataSample = {
  title: "title",
  movieUrl: "",
  movieReleaseYear: 1254,
  rank: 1,
  rating: 9.8,
  posterImgUrl: "",
  cast: ["mem1", "mem2"],
  director: "",
  stroyline: "",
  genre: [],
};

// Get the Initial data
// The top 250 movie data doesnt require the js to render
const getTop250HTML = async () => {
  try {
    const response = await axios.get(`https://www.imdb.com/chart/top/`, {
      responseType: "text",
    });
    return response.data;
  } catch (error) {
    console.error(error);
  }
};

const getMovieWindowObj = (Html) => {
  const { window } = new JSDOM(Html);
  return window;
};

const getMovieArrBasic = (movieWindowObj) => {
  try {
    return Array.from(
      movieWindowObj.document.querySelectorAll("tbody > tr")
    ).map((el, i) => {
      {
        const movieObj = {
          title: el.querySelector("td.titleColumn > a").textContent,
          movieUrl:
            "https://www.imdb.com/" +
            el.querySelector("td.titleColumn > a").href,
          movieReleaseYear: parseInt(
            el.querySelector("td.titleColumn > span").textContent.substr(1, 5)
          ),
          rank: parseInt(
            el
              .querySelector("td.titleColumn")
              .childNodes[0].textContent.trim()
              .slice(0, -1)
          ),
          rating: parseFloat(
            el.querySelector("td.ratingColumn.imdbRating > strong").textContent
          ),
        };
        return movieObj;
      }
    });

    return movieArr;
  } catch (error) {
    console.error(error);
  }
};

const getMovieArrAdv = async (movieArr) => {
  //create an array of promises
  try {
    //
    // NOTE: its better to use basic for loop creating different promises, rather than using promises.allSettleed,
    // which is more prone to crashing

    for (let i = 0; i < movieArr.length; i++) {
      const tempHtml = await axios.get(movieArr[i].movieUrl, {
        responseType: "text",
      });
      // allMovieHTMLs.push(tempHtml);
      console.log(
        "the loading of html of movie" + movieArr[i].rank + "is done"
      );

      const tempMovieWindowObj = getMovieWindowObj(tempHtml.data);

      const HtmlObj = tempMovieWindowObj.document.querySelector(
        ".plot_summary"
      );
      movieArr[i].director = HtmlObj.querySelector(
        "div:nth-child(2) > a"
      ).textContent.trim();
      castArrTotal = Array.from(
        HtmlObj.querySelectorAll("div:nth-child(4) > a")
      );
      castArrTotal.pop();

      movieArr[i].cast = castArrTotal.map((el) => {
        return el.textContent.trim();
      });
      movieArr[i].storyline = tempMovieWindowObj.document
        .querySelector("#titleStoryLine > div:nth-child(3) > p > span")
        .textContent.trim();
      movieArr[i].posterImgUrl = tempMovieWindowObj.document.querySelector(
        ".poster > a > img"
      ).src;
    }

    return movieArr;
  } catch (error) {
    console.error(error);
  }
};

const downloadImgs = async (movieArr) => {
  try {
    let promiseArr = [];
    for (let i = 0; i < movieArr.length; i++) {
      const tempImg = await axios.get(movieArr[i].posterImgUrl, {
        responseType: "stream",
      });
      console.log("Successfully downloaded stream!,", i + 1);
      promiseArr.push(tempImg);
    }

    if (!fs.existsSync("./images")) {
      fs.mkdirSync("./images");
    }

    // promiseArr.forEach((el, i) => {
    for (let i = 0; i < promiseArr.length; i++) {
      // here, we use rank instead of title, coz title somtimes contains the colon, which is not acceptable
      const imgDnld = promiseArr[i].data.pipe(
        fs.createWriteStream(`images/${movieArr[i].rank}.png`)
      );
      imgDnld.on("finish", () => {
        console.log("Successfully downloaded file!,", i + 1);
      });
    }
  } catch (error) {
    console.error(error);
  }
};

const main = async () => {
  const moviesHTML = await getTop250HTML();
  console.log("Completed getting the Chart of the Top 100 movies");

  const movieWindowObj = getMovieWindowObj(moviesHTML);
  console.log("Completed creating the DOM structure out of the html");

  let movieArr = getMovieArrBasic(movieWindowObj);
  console.log("Completed getting basic info of all movies");

  movieArr = await getMovieArrAdv(movieArr);
  console.log("Completed Populating the complete details to the movieArr obj");
  console.log(movieArr);

  fs.writeFileSync("./data.json", JSON.stringify(movieArr));

  const movieArr = await util.promisify(fs.readFile)("./data.json", "utf8");
  console.log(JSON.parse(movieArr).length);
  await downloadImgs(JSON.parse(movieArr));

  // console.log(movieArr);
};

main();
