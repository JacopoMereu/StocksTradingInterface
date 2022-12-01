// const
const _default_sample_size = 400;

// current data and timeframe
var _curr_filename = "";
var _curr_data = [];
var _curr_sliced_data = [];
var _curr_timeframe = "";
var _ohcl_chart_style = "candlestick";
var _curr_colors = "colors1";
var _curr_data_sample_size = _default_sample_size;
// checkbox values
var _candlestick_enabled = false;
var _overlap_indicators_enabled = false;
var _overlap_titles_enabled = false;
var _indicator_windows_enabled = false;
// indicator list
var _overlap_indicators_json = {}
var _volatility_indicators_json = {}
var _strength_indicators_json = {}
var _volume_indicators_json = {}


window.onload = function () {
    mainMenu_SetStaticElements();
    mainSVG()
}

function mainSVG() {
    const width = window.innerWidth;
    const height = window.screen.height;

    console.log("height: " + height)
    const svg = d3.select("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto;")
        // .on('contextmenu', e => e.preventDefault()) // prevent menu on right click

    console.log("height: " + svg.attr('height'));

    // read JSON file in data/results/header.json
    const json_header = (function () {
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

    // add the options to the dropdown
    [default_filename, default_timeframe] = setDatasetDropdownOptionsHTML(json_header)


    // load default data
    load_data(default_filename, default_timeframe)
}

//// RENDERING ///////////////////////////
function updateGraphRendering() {
    render_data(_curr_sliced_data, _curr_timeframe);
}

/**
 * This method is called if the user changes the number of data points to be displayed
 */
function updateNDataRendered() {
    _curr_sliced_data = _curr_data.slice(-getDataSampleSize());

    // UPDATE INDICATORS ACCORDING TO THE NEW SLICED DATA
    updateIndicators();

    // update rendering
    updateGraphRendering();
    mainMenu_UpdateDynamicElements()
}

const render_data = (data, timeframe) => {
    const charts = d3.selectAll(`.${chartsClass}`)
    const old_transform = !charts.empty() ? charts.attr('transform') : undefined;
    charts.remove();

    const svg = d3.select("svg");


    //////////// render data ////////////
    mainRender(
        data,
        {
            date: d => d3.utcParse("%Y-%m-%d %H:%M:%S")(d.Time),//new Date(d.Time),
            high: d => +d.High,
            low: d => +d.Low,
            open: d => +d.Open,
            close: d => +d.Close,
            volume: d => +d.Volume,
            timeframe: timeframe,
            yLabel: "↑ Price ($)",
            width: 1500,
            height: 700,
            marginLeft: 80,
            marginTop: 40,
            marginBottom: 30,
            colors: getColors()
        })


    //////////// ZOOM
    let zoom = d3.zoom()
        .on('zoom', handleZoom);

    function handleZoom(e) {
        d3.selectAll(`.${chartsClass}`).attr('transform', e.transform);
    }

    svg.call(zoom);
    if (old_transform)
        d3.selectAll(`.${chartsClass}`).attr('transform', old_transform);

};

function load_data(filename, timeframe) {

    let folder = "data/results/";
    let ext = '.csv';
    const full_path = folder + filename + '/' + timeframe + ext

    resetIndicators();

    d3.csv(full_path)
        .then(data => {
            // filter and update the loaded data
            data = data.filter(d => d.Close !== "" || d.Open !== "" || d.High !== "" || d.Low !== "");
            _curr_data = data;
            _curr_sliced_data = data.slice(-getDataSampleSize());
            _curr_filename = filename;
            _curr_timeframe = timeframe;

            // ADD DEFAULT INDICATORS FOR PRACTICALITY
            addDefaultIndicators();

            // update rendering
            updateGraphRendering();
            mainMenu_UpdateDynamicElements()

        });


}

function addDefaultIndicators() {
    // Overlap indicator goes directly on the chart
    addIndicatorFunction("SMA", 50)
    addIndicatorFunction("EMA", 14)

    // Volatility indicator
    addIndicatorFunction("NATR", 14)
    addIndicatorFunction("NATR", 24)
    addIndicatorFunction("NATR", 50)

    // Momentum indicator goes on the bottom
    addIndicatorFunction("RSI", 24)
    addIndicatorFunction("RSI", 14)

    // Volume indicator goes on the bottom
    addIndicatorFunction("ADOSC", undefined, 3, 10);
}

//////////////////////////////////////////

//// Function to change the data to display
// SETTERS
function resetIndicators() {
    _overlap_indicators_json = {"global_max": 0, "functions": []};
    _volatility_indicators_json = {"global_max": 0, "functions": []};
    _strength_indicators_json = {"global_max": 0, "functions": []};
    _volume_indicators_json = {"global_max": 0, "global_min": 0, "functions": []};
}

function updateIndicators() {
    const list = [_overlap_indicators_json, _volatility_indicators_json, _strength_indicators_json, _volume_indicators_json]
    let output = [];

    for (let i = 0; i < list.length; i++) {
        let indicator_json = list[i];

        for (let j = 0; j < indicator_json.functions.length; j++) {
            let indicator = indicator_json.functions[j];

            // get name, windows size, small window size, large window size
            let name = indicator.name;
            let window_size = +indicator.window_size;
            let small_window_size = +indicator.small_window_size;
            let large_window_size = +indicator.large_window_size;

            output.push([name, window_size, small_window_size, large_window_size])
        }
    }
    resetIndicators()
    output.forEach(indicator => {
        addIndicatorFunction(indicator[0], indicator[1], indicator[2], indicator[3])
    })

}

function addIndicatorFunction(funName, funWindowSize = undefined, funSmallWindowSize = undefined, funLargeWindowSize = undefined) {

    // Generate the indicator function/data
    const funData = isNaN(funWindowSize)
        ? eval(`${funName}(${JSON.stringify(_curr_sliced_data)}, ${funSmallWindowSize}, ${funLargeWindowSize})`)
        : eval(`${funName}(${JSON.stringify(_curr_sliced_data)}, ${funWindowSize})`);

    //TODO ADD A WAY TO FIND THE INDICES OF SPECIAL POINTS (RSI > 70, etc)
    const specialPointsIndexes = [1, 10, 20,30,40,50,60]
    // Get the points value from the indeces
    const specialPoints = specialPointsIndexes.map(i => [i,funData[i]])
    //TODO END

    const funColor = getRandomColor(); // Generate a random color for the indicator
    const indicator_json = getIndicatorsJSON(funName); // Get the correct list of indicators to which the new indicator will be added

    const localMax = d3.max(funData); // Local maximum
    // Add the indicator to the list of indicators
    indicator_json['functions'][Object.keys(indicator_json['functions']).length] = {
        ...(!isNaN(funWindowSize)) && {"window_size": funWindowSize},
        ...(!isNaN(funSmallWindowSize)) && {"small_window_size": funSmallWindowSize},
        ...(!isNaN(funLargeWindowSize)) && {"large_window_size": funLargeWindowSize},
        "name": funName,
        "color": funColor,
        "window_size": funWindowSize,
        "data": funData,
        "max": localMax,
        "special_points": specialPointsIndexes //TODO ADDED THIS
    }

    // Evaluate global maximum and minimum
    if (indicator_json["global_max"] < localMax)
        indicator_json["global_max"] = localMax;
    if ("global_min" in indicator_json) {
        const local_min = d3.min(funData);
        if (local_min < indicator_json["global_min"]) {
            indicator_json["global_min"] = local_min;
        }

    }

    // Sort according to the window size descending
    indicator_json['functions'] = indicator_json['functions'].sort(function (x, y) {
        return d3.descending(x['window_size'], y['window_size']);
    })
}
function removeIndicatorFunctionByD3Select(id) {
    const idSplit = id.split('-')
    const funName = idSplit[0]
    const idInsideList = idSplit[1]
    getIndicatorsJSON(funName)['functions'].splice(idInsideList)

    updateGraphRendering()
}
function setColors(colors) {
    _curr_colors = colors;
}

function setOverlappingIndicatorsVisibility(isChecked) {
    _overlap_indicators_enabled = isChecked;
}

function setOverlappingTitlesVisibility(isChecked) {
    _overlap_titles_enabled = isChecked;
}

function setPatternsVisibility(isEnabled) {
    _candlestick_enabled = isEnabled;
}

function setIndicatorWindowsVisibility(isChecked) {
    _indicator_windows_enabled = isChecked;
}

function setOHCLChartStyle(style) {
    _ohcl_chart_style = style;
}

function setDataSampleSize(new_size) {
    _curr_data_sample_size = new_size;
}

// GETTERS
function getDataSampleSize() {
    return _curr_data_sample_size;
}

function getColors() {
    if (_curr_colors === "colors1")
        return ["#4daf4a", "#999999", "#e41a1c"]
    else if (_curr_colors === "colors2")
        return ["#ffffff", "#999999", "#000000"]
}

function getOHCLChartStyle() {
    return _ohcl_chart_style;
}

function getPatternsVisibility() {
    return _candlestick_enabled;
}

function getOverlappingIndicatorsVisibility() {
    return _overlap_indicators_enabled;
}

function getOverlappingTitlesVisibility() {
    return _overlap_titles_enabled;
}

function getIndicatorWindowsVisibility() {
    return _indicator_windows_enabled;
}

function getOverlappingIndicatorsJSON() {
    return _overlap_indicators_json;
}

function getVolatilityIndicatorsJSON() {
    return _volatility_indicators_json;
}

function getStrengthIndicatorsJSON() {
    return _strength_indicators_json;
}

function getVolumeIndicatorsJSON() {
    return _volume_indicators_json;
}

function getIndicatorsJSON(indicatorName) {
    const volatility_list = ["ATR", "NATR"];
    const overlap_list = ["SMA", "EMA"];
    const strength_list = ["RSI"];
    const volume_list = ["ADOSC"];

    if (overlap_list.includes(indicatorName))
        return _overlap_indicators_json;
    else if (volatility_list.includes(indicatorName))
        return _volatility_indicators_json;
    else if (strength_list.includes(indicatorName))
        return _strength_indicators_json;
    else if (volume_list.includes(indicatorName))
        return _volume_indicators_json;
    else
        return null;
}

//////////////////////////////////////////////////

// Return a random color
function getRandomColor() {
    let letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// INDICATORS //////////////////////////

// source: https://en.wikipedia.org/wiki/Moving_average#Simple_moving_average
function SMA(data, windows_size = 14) {
    let indicator_data = [];

    for (let i = 0; i < data.length; i++) {
        if (i < windows_size) {
            indicator_data.push(0);
        } else {
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
function EMA(data, windows_size = 14) {
    return EMA_close(data.map(d => +d.Close), windows_size);
}

function EMA_close(close, windows_size = 14) {
    const alpha = 2 / (windows_size + 1);
    const EMA_rec = (close, windows_size, i) => {
        const currentClose = close[i];
        if (i === 0)
            return currentClose;

        const EMA_yesterday = EMA_rec(close, windows_size, i - 1);
        return EMA_yesterday + alpha * (currentClose - EMA_yesterday);
    }

    let indicator_data = [];
    for (let i = 0; i < close.length; i++) {
        if (i < windows_size) {
            indicator_data.push(0);
        } else {
            let EMA_yesterday;
            if (i === windows_size) {
                // The recursive function is needed only for the first non-zero value
                EMA_yesterday = EMA_rec(close, windows_size, i - 1);

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
function ATR(data, windows_size = 14) {
    const TR = (data, current_idx) => {
        // get previous close if it exists
        const previous_close = data[current_idx - 1]?.Close;
        const current_high = data[current_idx].High;
        const current_low = data[current_idx].Low;

        // if previous close doesn't exist, return 0
        if (isNaN(previous_close)) return 0;

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
        } else if (i === windows_size + 1) {
            let sum = 0;
            for (let j = 0; j < windows_size; j++) {
                sum += TR(data, i - j);
            }
            indicator_data.push(sum / windows_size);
        } else {
            const prevATR = indicator_data.slice(-1);
            const currentTR = TR(data, i);
            indicator_data.push((prevATR * (windows_size - 1) + currentTR) / windows_size);
        }
    }
    return indicator_data;
}

function NATR(data, windows_size = 14) {
    const atr = ATR(data, windows_size);

    return atr.map((v, i) => v / +data[i].Close * 100);

}

// https://en.wikipedia.org/wiki/Relative_strength_index
function RSI(data, windows_size = 14) {
    const RSI = [];

    // get close value where the current value is greater than the previous value, 0 otherwise
    const U = [0];
    const D = [0];
    for (let i = 1; i < data.length; ++i) {
        const current_close = +data[i].Close;
        const previous_close = +data[i - 1].Close;
        if (current_close > previous_close) {
            U.push(current_close - previous_close);
            D.push(0);
        } else {
            U.push(0);
            D.push(previous_close - current_close);
        }
    }

    const EMA_U = EMA_close(U, windows_size);
    const EMA_D = EMA_close(D, windows_size);

    const RS = EMA_U.map((v, i) => v / EMA_D[i])

    for (let i = 0; i < RS.length; ++i) {
        RSI.push(100 - (100 / (1 + RS[i])));
    }
    return RSI;
}

// https://en.wikipedia.org/wiki/Accumulation/distribution_index
function AD(data) {
    const AD = [0];

    let prev_AD = 0;
    for (let i = 1; i < data.length; ++i) {
        const current_close = +data[i].Close;
        const current_volume = +data[i].Volume;
        const current_high = +data[i].High;
        const current_low = +data[i].Low;

        // close --> low => mfm --> -1    || close --> high => mfm ---> +1
        const money_flow_multiplier = ((current_close - current_low) - (current_high - current_close)) / (current_high - current_low);
        const money_flow_volume = money_flow_multiplier * current_volume;
        const current_AD = prev_AD + money_flow_volume;

        AD.push(current_AD);
        prev_AD = current_AD;
    }

    return AD;
}

// https://en.wikipedia.org/wiki/Chaikin_Analytics
function ADOSC(data, small_window = 4, large_window = 7) {
    const ad = AD(data);

    const EMA_AD_small = EMA_close(ad, small_window);
    const EMA_AD_large = EMA_close(ad, large_window);

    return EMA_AD_small.map((v, i) => i >= large_window ? v - EMA_AD_large[i] : 0);
}

//////////////////////////