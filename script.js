//DOM elements:
let tkrBtn = document.getElementById("submitTickerBtn");
let tkrInputBox = document.getElementById("tickerInput");
let tkr;
const url = "https://www.alphavantage.co/query?";
let func = "TIME_SERIES_DAILY";
// const API_KEY = "9J8ADQSIH2XFEWKB";
const API_KEY = "58LM7L853QO9JB9U";
let graphDiv = document.getElementById("graphDiv");


// API KEY: 9J8ADQSIH2XFEWKB;
// https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=IBM&apikey=demo


// Submit button pressed
tkrBtn.addEventListener("click", e => {
    e.preventDefault();

    tkr = tkrInputBox.value;
    tkrInputBox.value = "";
    console.log(tkr);

    if(tkr){
        startProgram();
    }
    else{
        alert("Invalid/No ticker symbol")
    }

})



// Essentially just running the entire program (math, chart generation, grabbing stock info)
const startProgram = async () => {

    const data = await fetchData()
    console.log(data);

    // Returns today's date in XXXX-XX-XX (yr-mon-day) format
    const todaysDate = getDate();
    console.log("Today's date: ", todaysDate);


    // Most recent date with stock informtion in the API
    const lastRefreshed = data["Meta Data"]["3. Last Refreshed"]
    console.log("Last refreshed: ", lastRefreshed);

    // In case today's date doesn't exist in the API, we wanna make sure the user understands the graph's
    // algoCalc are based on a previous date. We want to maintain transparency
    if(lastRefreshed != todaysDate){
        // alert(`Today's date is unavailable for use, all algoCalc will be based on the most recent available date: ${lastRefreshed}`)
    }


    let xAxisValues = await generateXAxis(lastRefreshed); // for our chart and predicted days
    let yAxisValues = await generateYAxis(data, lastRefreshed); 
    let isPositive = (yAxisValues[yAxisValues.length-1] - yAxisValues[0]) >= 0;
    
    if(graphDiv.innerHTML != ""){graphDiv.innerHTML = ""} // double check this works

    let canvas = document.createElement("canvas");
    graphDiv.appendChild(canvas);
    generateChart(canvas, xAxisValues, yAxisValues, isPositive);



}

const clearChart = () => {



}


const generateChart = async (canvas, x, y, isPos) => {

    const ctx = canvas.getContext('2d');


    // const y = await yPromise;
    // const x = await xPromise;

    const lineColor = isPos ? "green" : "red";

    new Chart(ctx, {
        type: "line",
        data: { 
            labels: x,
            datasets: [
                {
                    data: y,
                    label: "General Stock Path",
                    borderColor: lineColor,
                    fill: false,
                    tension: 0.1
                }
            ]

        },
        options: {
            scales: {
              y: {
                beginAtZero: false, 
                suggestedMin: Math.min(...y), 
                suggestedMax: Math.max(...y)
              }
            }
          }

    })



}



// Returns stock data (high, low, open, close) within a 3 month ish period of the stock entered via input form
const fetchData = () => {

    console.log(`${url}${func}&symbol=${tkr}&apikey=${API_KEY}`)
    return (
        fetch(`${url}function=${func}&symbol=${tkr}&apikey=${API_KEY}`)
        .then(res => res.json())
    )

}


// Returns today's date as XXXX-XX-XX
const getDate = () => {

    const dateObj = new Date();
    return formatDate(dateObj)
   
}


const generateXAxis = async (startingDate) => {

    let arr = [];
    const [year, month, day] = startingDate.split('-').map(Number); 
    let date = new Date(year, month - 1, day); 


    for(let i = 0; i < 7; i++){
        
        date.setDate(date.getDate() + 1);
        
        // We want to check if it's a weekend
            // If so, add next date of course, but i-- so we still end up w/ 7 dates
        if(date.getDate() === 6 || date.getDate() === 0){
            date.setDate(date.getDate() + 1);
            i--;
            continue;
        }

        //Using weekdate date object, we want to push into arr as "x/xx"
        arr.push(`${date.getMonth()+1}/${date.getDate()}`)

 
    }
    
    return arr;

}



 const generateYAxis = async (data, date) => {

    let lastRefreshedPrice = getPrice(data, date); // Already existing last refreshed. Once we generate the next days price (which doesn't exist in API), this will change
    let validDatePrices = []

    while(validDatePrices.length != 7){

        let datePair = []
        date = getPrevDate(date);
        const aheadDate = getValidAheadDate(data, date); // Soonest date after date value rn that has an entry/price in the api

        if(!stockPriceForDateExists(data, date)){

            date = getPrevDate(date);
            continue;

        }

        console.log("Before we push, this is aheadDate: ", aheadDate, " and this is date: ", date);
        datePair.push(getPrice(data, aheadDate));
        datePair.push(getPrice(data, date));
        validDatePrices.push(datePair);

    }

    console.log(validDatePrices); 

    let priceArr = []
    // while(priceArr.length != 7){ 
    while(priceArr.length != 7){

        let sum = algoCalc(validDatePrices, lastRefreshedPrice); // Algo generates next values
        let newPrice = lastRefreshedPrice + sum; // Create the next day's prices

        priceArr.push(newPrice); // We're gonna be returning the price array anyway so this needs to change
        let newDatePair = [newPrice , lastRefreshedPrice];  // So we can update algo with our own guessed value

        validDatePrices.pop(); // Gets rid of last entry point since we're adding one to the front (keeps 7 elements total)
        validDatePrices.unshift(newDatePair); // ^^ adding to front
        lastRefreshedPrice = newPrice; // updating our valid prices



    }
    
    return priceArr;


}







// problem is something here about the async function for sure, I think 
const algoCalc =  (datePricesArr, lastRefreshedPrice) => {

    let sum = 0;
    datePricesArr.forEach((element) => {
        
        const aheadDatePrice = parseInt(element[0]);
        const currDatePrice = parseInt(element[1]);


        const threshold = Math.abs(lastRefreshedPrice - currDatePrice) == 0 ? 1 : Math.abs(lastRefreshedPrice - currDatePrice);
        const difference = aheadDatePrice - currDatePrice;


        if(Math.abs(difference) >= threshold){

            let multiplier = Math.floor(Math.abs(difference) / threshold);
            sum += multiplier * difference;

        }
        else{

            sum+= difference;

        }


    })


   console.log(sum);
    return sum;


}


  

const getPrevDate = (date) => {

    const [year, month, day] = date.split('-').map(Number);
    date = new Date(year, month-1, day);
    date.setDate(date.getDate() - 1);
    
    return formatDate(date);

}


// Returns date object as "XXXX-XX-XX" particularly useful for API recognition
const formatDate = (date) => {

    //Date is a date object already
    const padStartMonth = (`${(date.getMonth() + 1)}`).padStart(2, "0");
    const padStartDate = (`${date.getDate()}`.padStart(2, "0"));

    return(
        `${date.getFullYear()}-${padStartMonth}-${padStartDate}`
    );

}

const getPrice = (data, date) => {

    return parseInt(data["Time Series (Daily)"][date]["4. close"]);

}


const stockPriceForDateExists = (data, date) => {

    return date in data["Time Series (Daily)"];

}

const getValidAheadDate = (data, date) => {

    const [year, month, day] = date.split('-').map(Number);
    date = new Date(year, month-1, day);
    date.setDate(date.getDate() + 1);


    // We want to generate the soonest next date that exists in data after the date
    while(true){

        let formattedDate = formatDate(date);
        if(stockPriceForDateExists(data, formattedDate)){
            return formattedDate;
        }

        date.setDate(date.getDate() + 1);

    }



}