import {ALPHA_VANTAGE_API_KEY} from './ApiKeys.js';
import {TimeSeriesData} from "./Types.js";

//Declare type of axios
declare let axios:any;

/** Raw data files from third parties are stored locally so that
 *  application can run in the browser without CORS issues.
 *  This class parses the raw data and converts it into the time
 *  series format that is used by the application. This time series
 *  is then output as JSON and manually copied into a file, from which it
 *  is loaded by the Data class.
 */
export class DataProcessor {

    /** Extracts daily deaths in the UK from Covid */
    static async extractCovidData(){
        //Historical data for Covid. Source: https://api.coronavirus.data.gov.uk/v1/data
        const url:string = "data/UKCovid.txt";
        let covidData = ( await axios.get(url) ).data;

        //Convert to time series
        let finalData:TimeSeriesData[] = [];
        for(let day of covidData){
            //console.log("Date: " + day.date + "; dailyDeaths: " + day.deathsDaily);
            if(day.deathsDaily !== null) {
                finalData.push({
                    timeStamp: new Date(day.date).valueOf(),
                    value: day.deathsDaily
                });
            }
        }
        console.log(JSON.stringify(finalData));
    }


    /** Extracts max temperature for Heathrow in the UK */
    static async extractWeatherData(){
        //Historical data for Heathrow. Source: https://www.metoffice.gov.uk/pub/data/weather/uk/climate/stationdata/heathrowdata.txt
        const url:string = "data/HeathrowWeather.txt";
        let heathrowData = ( await axios.get(url) ).data;
        //console.log(heathrowData);

        let finalData:TimeSeriesData[] = [];

        let lines:string[] = heathrowData.split('\n');
        for(let line of lines){
            if(line.charAt(0) !== '#' && line !== ""){//Filter out header, info, etc.
                let lineData:string[] = line.split(' ');
                let year:number = -300, month:number = -300, maxTemp:number = -300;
                //console.log(lineData);
                for(let i:number=0; i<lineData.length; ++i){
                    //Ignore blanks
                    while(lineData[i] === "")
                        i++;

                    //Store year
                    year = parseInt(lineData[i]);
                    ++i;

                    //Skip blanks
                    while(lineData[i] === "")
                        i++;

                    //Store month
                    month = parseInt(lineData[i]);
                    ++i

                    //Skip blanks
                    while(lineData[i] === "")
                        i++;

                    //Store max temp
                    maxTemp = parseFloat(lineData[i]);

                    //Break
                    break;
                }

                //Store data
                finalData.push ({
                    timeStamp: new Date("" + year + "-" + month + "-15").valueOf(),
                    value: maxTemp
                });
            }
        }
        //Output final data
        console.log(JSON.stringify(finalData));
    }


    /** Extracts adjusted close price for Microsoft */
    static async extractMicrosoftData(){
        const dailyUrl:string = "https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=MSFT&outputsize=full&apikey="+ALPHA_VANTAGE_API_KEY;
        const weeklyUrl:string = "https://www.alphavantage.co/query?function=TIME_SERIES_WEEKLY_ADJUSTED&symbol=MSFT&outputsize=full&apikey="+ALPHA_VANTAGE_API_KEY;
        console.log(dailyUrl);

        let dailyData = ( await axios.get(dailyUrl) ).data["Time Series (Daily)"];
        //console.log(dailyData);
        let msftPrices:TimeSeriesData[] = [];
        for(let key in dailyData){
            //console.log("Time: " + key + "; adjusted close: " + dailyData[key]["5. adjusted close"]);
            msftPrices.push({
                timeStamp: new Date(key).valueOf(),
                value: parseFloat(dailyData[key]["5. adjusted close"])
            });
        }
        console.log(JSON.stringify(msftPrices));
    }

}