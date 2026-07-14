import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { tool } from "@langchain/core/tools"
import { z } from "zod";
import axios from "axios";
import "dotenv/config";

const apiKey = process.env.GOOGLE_API_KEY;
const scrapToken = process.env.SERP_API_KEY;


const model = new ChatGoogleGenerativeAI(
    {
        model: "gemini-3.5-flash",
        temperature: 0.2,
        apiKey
    }
)

// Tool to search the web for event details, dates, and times using the Scrape.do API
const searchWebTool = tool(
  async ({ url }) => {
    console.log(`[LangChain Tool] Searching web for: '${url}'`);

    var targetUrl = encodeURIComponent(url);

    var config = {
    method: 'get',
    url: `http://api.scrape.do/?url=${targetUrl}&token=${scrapToken}&render=true`,
    headers: {
    },
    
    };
    try {
        const response =  await axios(config);
        const data = JSON.stringify(response.data);
        console.log(data.substring(0,data.length<100?data.length:100))
        return data;

    } catch (error) {
        console.error("Error searching web for event details:", error);
        throw error;
    }
  
  },
  {
    name: "searchWebForEvent",
    description: "Searches the web for event details, dates, and times.",
    schema: z.object({
      url: z.string().describe("The URL to search for event details. The URL to search for event details. Allowed base urls are: https://www.district.in/movies/, https://www.google.com/search"),
    }),
  }
);

// description("The URL to search for event details. The URL to search for event details. Allowed base urls are: https://www.district.in/movies/, https://www.google.com/search")

const eventSummarySchema = z.object({
  event_name: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  calendar_status: z.string().describe("Confirmation message from the calendar tool"),
});

model.withStructuredOutput(eventSummarySchema)

const agentExecutor = model
.bindTools([searchWebTool])



async function runAgent(prompt) {


    console.log("Starting LangChain Agent Execution...");
    const result = await agentExecutor.invoke(prompt);

    console.log("\n--- Final JSON Output (Fully Parsed Object) ---");
    console.log(JSON.stringify(result, null, 2));

    return result;
}


export { 
    runAgent
};