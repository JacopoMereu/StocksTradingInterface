// import * as d3 from d3;

window.onload = function() {
    main()
}

function main() {
     {
        width = 1500,
        height =800,
        marginLeft = 80,
        marginTop = 40,
        marginBottom = 15
    }

    const svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto; height: intrinsic;")

    // read JSON file in data/results/header.json
    // var b = require('data/results/header.json');

    const json = (function () {
        var json = null;
        $.ajax({
            'async': false,
            'global': false,
            'url': 'data/results/header.json',
            'dataType': "json",
            'success': function (data) {
                json = data;
            }
        });
        return json;
    })();

    // add the options to the button
    const allGroup = Object.keys(json)
    // option of the resourse
    d3.select("#selectButton")
        .on('change', event =>{
            const new_data_filename = event.target.value;
            const old_data_timeframe = d3.select('#selectFrameTime').property('value');
            load_data(new_data_filename, old_data_timeframe)
        })
        .selectAll('myOptions')
        .data(allGroup)
        .enter()
        .append('option')
        .text(function (d) { return d; }) // text showed in the menu
        .attr("value", function (d) { return d; }) // corresponding value returned by the button

    // time frame
    const allOptions = json[allGroup[0]].map(f=>f['timeframe'])
    d3.select("#selectFrameTime")
        .on('change', event =>{
            const old_data_filename = d3.select('#selectButton').property('value');
            const new_data_timeframe =event.target.value ;
            load_data(old_data_filename, new_data_timeframe)
        })
        .selectAll('myOptions')
        .data(allOptions)
        .enter()
        .append('option')
        .text(function (d) { return d; }) // text showed in the menu
        .attr("value", function (d) { return d; }) // corresponding value returned by the button

    // load data
    const default_filename = "btc-usd-2020"
    const default_timeframe = "1D"
    load_data(default_filename, default_timeframe)
}

function load_data(filename, timeframe) {
    d3.selectAll('.candles-class').remove();
    const svg = d3.select("svg");

    const render_data = data =>
    {
        // Volatility indicator
        const atr = ATR(data,  14);
        const natr = NATR(data, 14);

        // Overlap indicator goes directly on the chart
        const sma = SMA(data,  14);
        const ema = EMA(data,  14);
        const overlap_functions_json = {
            "sma": sma,
            "ema": ema
        }
        // Momentum indicator goes on the bottom
        const rsi = RSI(data,  14);

        //////////// render data ////////////
        mainRender(
            data,
            atr,
            rsi,
            overlap_functions_json, {
            date: d => d3.utcParse("%Y-%m-%d %H:%M:%S")(d.Time),//new Date(d.Time),
            high: d => +d.High,
            low: d => +d.Low,
            open: d => +d.Open,
            close: d => +d.Close,
            timeframe: timeframe,
            yLabel: "↑ Price ($)",
            width:1500,
            height: 800,
            marginLeft:80,
            marginTop:40,
            marginBottom:30,
        })
        // Append chart
        // svg.node().appendChild(chart);


        //////////// ZOOM
        let zoom = d3.zoom()
            .on('zoom', handleZoom);

        function handleZoom(e) {
            d3.selectAll('.candles-class').attr('transform', e.transform);
        }
        svg.call(zoom);

    };



    let folder = "data/results/";
    let ext = '.csv';
    const full_path = folder+filename+'/'+timeframe+ext


    d3.csv(full_path)
        .then(data => {
            data = data.filter(d => d.Close !== "" || d.Open !== "" || d.High !== "" || d.Low !== "");
            data = data.slice(-400);
            render_data(data);
        });
}

// source: https://en.wikipedia.org/wiki/Moving_average#Simple_moving_average
function SMA(data, windows_size=14) {
    let indicator_data = [];

    for (let i = 0; i < data.length; i++) {
        if (i < windows_size) {
            indicator_data.push(0);
        }
        else {
            const slice = data.slice(i - windows_size, i);
            // Get Close attribute from slice
            const close = slice.map(d => +d.Close);
            // Sum Close values
            const sum = close.reduce((a, b) => a + b, 0);
            // Calculate average
            const average = sum / windows_size;
            indicator_data.push(average);
        }
    }
    return indicator_data;
}
// source: https://en.wikipedia.org/wiki/Moving_average#Exponential_moving_average
function EMA(data, windows_size=14) {
    return EMA_close(data.map(d => +d.Close), windows_size);
}
function EMA_close(close, windows_size=14) {
    const alpha =2/(windows_size+1);
    const EMA_rec = (close, windows_size, i) => {
        const currentClose = close[i];
        if (i===0)
            return currentClose;

        const EMA_yesterday = EMA_rec(close, windows_size, i - 1);
        return EMA_yesterday + alpha * (currentClose - EMA_yesterday);
    }

    let indicator_data = [];
    for (let i = 0; i < close.length; i++) {
        if (i < windows_size) {
            indicator_data.push(0);
        }
        else {
            let EMA_yesterday;
            if (i === windows_size) {
                // The recursive function is needed only for the first non-zero value
                EMA_yesterday = EMA_rec(close, windows_size, i-1);

            } else {
                EMA_yesterday = indicator_data.slice(-1)[0];
            }

            const currentClose = close[i];
            const EMA_today = EMA_yesterday + alpha * (currentClose - EMA_yesterday);
            indicator_data.push(EMA_today);
        }
    }
    return indicator_data;
}
// source: https://en.wikipedia.org/wiki/Average_true_range
function ATR(data, windows_size=14) {
    const TR = (data, current_idx)=>{
        // get previous close if it exists
        const previous_close = data[current_idx-1]?.Close;
        const current_high = data[current_idx].High;
        const current_low = data[current_idx].Low;

        // if previous close doesn't exist, return 0
        if (previous_close === undefined) return 0;

        // return max of high - low, abs(high - prev_close), abs(low - prev_close)
        const high_minus_low = current_high - current_low;
        const high_minus_prev_close = current_high - previous_close;
        const low_minus_prev_close = current_low - previous_close;

        return Math.max(
            high_minus_low,
            Math.abs(high_minus_prev_close),
            Math.abs(low_minus_prev_close)
        );
    }
    let indicator_data = [];

    for (let i = 0; i < data.length; i++) {
        if (i <= windows_size) {
            indicator_data.push(0);
        }
        else if (i === windows_size+1) {
             let sum = 0;
             for (let j = 0; j < windows_size; j++) {
                 sum += TR(data,i - j);
             }
             indicator_data.push(sum / windows_size);
        }
        else {
            const prevATR = indicator_data.slice(-1);
            const currentTR = TR(data, i);
            indicator_data.push( (prevATR*(windows_size-1) + currentTR)/windows_size );
        }
    }
    return indicator_data;
}

function NATR(data, windows_size=14) {
    const atr =ATR(data, windows_size);
    return atr.map((v,i)=>v/+data[i].Close*100);
}
// https://en.wikipedia.org/wiki/Relative_strength_index
function RSI(data, windows_size=14) {
    const RSI = [];

    // get close value where the current value is greater than the previous value, 0 otherwise
    const U= []; const D = [];
    for (let i = 1; i < data.length; ++i) {
        const current_close = +data[i].Close;
        const previous_close = +data[i-1].Close;
        if(current_close > previous_close) {
            U.push(current_close - previous_close);
            D.push(0);
        } else {
            U.push(0);
            D.push(previous_close - current_close);
        }
    }

    const EMA_U = EMA_close(U, windows_size);
    const EMA_D = EMA_close(D, windows_size);

    const RS = EMA_U.map((v,i)=>v/EMA_D[i])

    for (let i = 0; i < RS.length; ++i) {
        RSI.push(100 - (100 / (1 + RS[i])));
    }
    return RSI;
}