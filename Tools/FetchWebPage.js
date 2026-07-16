import axios from "axios";
import "dotenv/config";
import { extractMovieDetails,extractDetailedMovieUrl,extractUniversalGoogleResults } from './ExtractShowDetails.js'

const scrapToken = process.env.SERP_API_KEY;

async function fetchWebPage(url) {

    var targetUrl = encodeURIComponent(url);

    var config = {
        method: 'get',
        url: `http://api.scrape.do/?url=${targetUrl}&token=${scrapToken}`,
        headers: {
        },
    }
    try {
        const response =  await axios(config);
        const data = typeof response.data === "string" ? response.data
        : response.data?.html || response.data?.content || response.data?.body || JSON.stringify(response.data);
        return data;

    } catch(e) {
        console.log("Error while fetch Web Page detials")
        throw error;
    }
    
}

// for debugging and testing the fetchWebPage function
// try {
//     const webResponse = await fetchWebPage("https://www.district.in/movies/the-odyssey-movie-tickets-in-new-delhi-MV187151?srsltid=AfmBOop30JogAakRmiIJX4mMWhKIckzebsenW3PVZBtg428UB7I4QEio")
//     // console.log(webResponse)
//     const movieDetails = extractMovieDetails(webResponse);
//     const structuredData = JSON.stringify(movieDetails, null, 2);
//     console.log(structuredData);

// }
// catch(e) {
//     console.log("Error while fetch Web Page detials")
// }

export {
    fetchWebPage
}
