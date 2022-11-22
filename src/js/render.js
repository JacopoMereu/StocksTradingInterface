// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/candlestick-chart


const candlesRectClass = 'rect-class';
const chartsClass = "candles-class";
const rectHighlightedColor = "#add8e6";
const _TEMP_SWITCH_WINDOW_MODE = false; //TODO delete this

function mainRender(
    data,
    {
        date = d => d.date, // given d in data, returns the (temporal) x-value
        open = d => d.open, // given d in data, returns a (quantitative) y-value
        close = d => d.close, // given d in data, returns a (quantitative) y-value
        high = d => d.high, // given d in data, returns a (quantitative) y-value
        low = d => d.low, // given d in data, returns  its lowest price
        volume = d => d.volume, // given d in data, returns its volume
        timeframe = "Undefined", // "15Min", "1H", "6H", "1D", "1W", "1M"
        marginTop = 20, // top margin, in pixels
        marginRight = 30, // right margin, in pixels
        marginBottom = 30, // bottom margin, in pixels
        marginLeft = 40, // left margin, in pixels
        width = 640, // outer width, in pixels
        chartWidth = Math.max(data.length * 10, width),
        height = 400, // outer height, in pixels
        xPadding = 0.4,
        stroke = "currentColor", // stroke color for the daily rule
        strokeLinecap = "round", // stroke line cap for the rules
        colors = ["#4daf4a", "#999999", "#e41a1c"] // [up, no change, down]
    } = {}) {
    let prevLow;
    let prevHigh;
    let currLow = height;
    let currHigh = 0;

    let xDomain = data.map(date);
    const xRange = [marginLeft, chartWidth - marginRight]; // [left, right]

    const Yo = data.map(open);
    const Yc = data.map(close);
    const Yh = data.map(high);
    const Yl = data.map(low);
    const Yv = data.map(volume);

    const xDomainAsRange = d3.range(Yl.length); // add a candle for the next day

    const dCandlePattern = data.map(d => d.candlestick_pattern);
    const dCandlePatternType = data.map(d => d.candlestick_pattern_type);

    // Get xAxis
    const [xScale, xAxis] = getAxisX(timeframe, xDomain, xRange, xPadding);
    xDomain = xScale.domain();
    createCandlestickChart(
        Yo,
        Yc,
        Yl,
        Yh,
        Yv,
        timeframe,
        dCandlePattern,
        dCandlePatternType,

        xScale, xAxis,
        marginTop, marginRight, marginLeft, marginBottom,
        chartWidth, height * 0.6,
        stroke, strokeLinecap, colors,
        getOverlappingIndicatorsJSON());

    ////// Create a second graph below the first one: ATR //////
    prevLow = currLow;
    prevHigh = currHigh;
    currHigh = prevLow * 0.6;
    currLow = prevLow * 0.8;
    marginBottom= 0;


    createVolatilityChart(
        getVolatilityIndicatorsJSON(),
        xDomainAsRange, xScale, xAxis,
        currLow, currHigh,
        marginTop, marginRight, marginLeft, marginBottom,
        chartWidth,
        stroke, strokeLinecap, colors);

    ////// Create third diagram: RSI //////
    prevLow = currLow;
    prevHigh = currHigh;
    currHigh = prevLow * 1;
    currLow = prevLow * 1.2;
    marginBottom= 0;

    createStrengthChart(
        getStrengthIndicatorsJSON(),
        xDomainAsRange, xScale, xAxis,
        currLow, currHigh,
        marginTop, marginRight, marginLeft, marginBottom,
        chartWidth,
        stroke, strokeLinecap, colors
    )

    // ////// Create 4° diagram: volume //////
    prevLow = currLow;
    prevHigh = currHigh;
    currHigh = prevLow * 1;
    currLow = prevLow * 1.2;
    marginBottom= 0;

    createVolumeChart(
        getVolumeIndicatorsJSON(),
        xDomainAsRange, xScale, xAxis,
        currLow, currHigh,
        marginTop, marginRight, marginLeft, marginBottom,
        chartWidth,
        stroke, strokeLinecap, colors
    )
    ///////////

    // End
}


///////////////// main part /////////////////
function createCandlestickChart(
    Yo,
    Yc,
    Yl,
    Yh,
    Yv,
    timeframe,
    dCandlePattern,
    dCandlePatternType,
    xScale, xAxis,
    marginTop, marginRight, marginLeft, marginBottom,
    chartWidth, chartHeight,
    stroke, strokeLinecap, colors,
    overlap_functions_json
) {

    // Create g for zooming
    const container = d3.select('svg').append("g").attr('class', chartsClass);

    const xDomain = xScale.domain();
    const xPadding = xScale.padding();
    const xDomainAsRange = d3.range(Yl.length);

    const yAxisLabel = '↑ Price ($)'; // a label for the y-axis
    let yDomain = [d3.min(Yl), d3.max(Yh)];
    const yRange = [chartHeight - marginTop, marginTop]; // [bottom, top]

    // Get yAxis
    const [yScale, yAxis] = getAxisY(yDomain, yRange, chartHeight / 40);

    // INNER FUNCTIONS
    // Create the gs containing the candlesticks data and add the data
    function add_CandlesticksData_groups() {
        const gElementsList = container
            .append("g")
            .on("mouseover", event => {
                // GET THE G CONTAINING THE MOUSE
                let gContainer = d3.select(event.target.parentNode);

                // HIGHLIGHT THE RECTANGLE CONTAINING THE MOUSE POINTER
                highlight_rect_in_current_chart(gContainer, true);

                // UPDATE THE CANDLESTICK PATTERN TEXT FROM '*' TO ITS NAME
                let a = gContainer.selectAll('text');
                if (a.text() !== "") a.text(i => dCandlePattern[i]);


                //TODO TO BE REVIEWED
                // DISPLAY THE EXTERNAL TOOLTIP AND UPDATE ITS HTML WITH THE ONE SAVED INTO THE LOCAL
                if (getOverlappingIndicatorsVisibility() && getOverlappingTitlesVisibility()) {
                    let local_tooltip = gContainer.select('.tooltip')
                    let external_tooltip = d3.select('.tooltip');
                    external_tooltip
                        .style("left", (event.x) + "px")
                        .style("top", (event.y - 32) + "px")
                        .style("opacity", .9)
                        .html(local_tooltip.html());
                }

                // UPDATE THE LEGEND CONTAINING THE OPEN, CLOSE, HIGH, LOW, DATE AND VOLUME LABEL
                //TODO TO BE REVIEWED
                const formatDate = d3.utcFormat("%e-%b-%Y  %H:%M");
                const formatValue = d3.format(".2f");
                const formatChange = (f => (y0, y1) => f((y1 - y0) / y0))(d3.format("+.2%"));
                const date_string = gContainer.attr('date');
                const open_string = gContainer.attr('open');
                const close_string = gContainer.attr('close');
                const low_string = gContainer.attr('low');
                const high_string = gContainer.attr('high');
                const volume_string = gContainer.attr('volume');
                d3.select('#label_date').text(formatDate(new Date(date_string)));
                d3.select('#label_open').text("Open:" + formatValue(open_string));
                d3.select('#label_close').text("Close:" + formatValue(close_string) + ' (' + formatChange(open_string, close_string) + ')');
                d3.select('#label_high').text("High:" + formatValue(high_string));
                d3.select('#label_low').text("Low:" + formatValue(low_string));
                d3.select('#label_volume').text("Volume:" + formatValue(volume_string));
            })
            .on("mouseout", event => {
                let gContainer = d3.select(event.target.parentNode);

                // Hide the tooltip
                d3.select('.tooltip').style("opacity", 0);

                // highlight the rectangle in the current chart
                highlight_rect_in_current_chart(gContainer, false);

                let a = gContainer.selectAll('text');
                if (a.text() !== "") a.text('*');
            })
            .attr('class', 'data-class')
            .attr("stroke", stroke)
            .attr("stroke-linecap", strokeLinecap)
            .selectAll("g")
            .data(xDomainAsRange)
            .join("g")
            .attr('class', i => `data-${i}`)
            .attr('id', 'candlestick-container')
            .attr("transform", i => `translate(${xScale(xDomain[i])},${0})`)
            .attr('open', (d, i) => Yo[i])
            .attr('close', (d, i) => Yc[i])
            .attr('high', (d, i) => Yh[i])
            .attr('low', (d, i) => Yl[i])
            .attr('date', (d, i) => xDomain[i])
            .attr('volume', (d, i) => Yv[i])
        ;

        // Create a rect as high as the container
        addRects(gElementsList, xScale, xPadding, marginTop, chartHeight - marginBottom - marginTop);

        // Add 2nd style: linechart close
        let data2 = xDomainAsRange.map(i => [xScale(xDomain[i]), yScale(Yc[i])])
        // container
        //     .selectAll(null)
        //     .data(d3.pairs(data2))
        //     .enter()
        //     .append("line")
        //     //d[i][j] i=0,1 j=0,1. i=candle, j=x,y
        //     .attr("x1", d => d[0][0])
        //     .attr("x2", d => d[1][0])
        //     .attr("y1", d => d[0][1])
        //     .attr("y2", d => d[1][1])
        //     .style("stroke-width", "2px")
        //     .style("stroke", d =>{
        //         return colors[1 + Math.sign(d[1][1] - d[0][1])]
        //     })

        // thick
        gElementsList.append("line")
            .data(d3.pairs(data2))
            .attr('class', 'style_linechart')
            .attr("x1", () => 0)
            .attr("x2", d => d[1][0] - d[0][0])
            .attr("y1", d => d[0][1])
            .attr("y2", d => d[1][1])
            .style("stroke-width", "3px")
            .style("stroke", 'black');

        // thin
        gElementsList.append("line")
            .data(d3.pairs(data2))
            .attr('class', 'style_linechart')
            .attr("x1", () => 0)
            .attr("x2", d => d[1][0] - d[0][0])
            .attr("y1", d => d[0][1])
            .attr("y2", d => d[1][1])
            .style("stroke-width", "2px")
            .style("stroke", (d, i) => {
                return colors[1 + Math.sign(d[1][1] - d[0][1])]
            });

        // Shadow of the candle
        gElementsList.append("line")
            .attr("class", "style_candlestick")
            .attr("y1", i => {
                return yScale(Yl[i])
            })
            .attr("y2", i => yScale(Yh[i]));

        // Real body of the candle
        // line real body
        // gElementsList.append("line")
        //     .attr("class", "style_candlestick")
        //     .attr("y1", i => yScale(Yo[i]))
        //     .attr("y2", i => yScale(Yc[i]))
        //     .attr("stroke-width", xScale.bandwidth())
        //     .attr("stroke", i => colors[1 + Math.sign(Yo[i] - Yc[i])]);

        // rect real body
        gElementsList.append("rect")
            .style("stroke-width", "1")
            .attr("class", "style_candlestick")
            .style("fill", i => colors[1 + Math.sign(Yo[i] - Yc[i])])
            .style("stroke", "black")
            .attr("x", -xScale.bandwidth() / 2)
            .attr("y", i => yScale(Math.max(Yc[i],Yo[i])) )
            .attr("width", xScale.bandwidth())
            .attr("height", i => {
                const y= yScale(Math.min(Yc[i],Yo[i])) - yScale(Math.max(Yc[i],Yo[i]));
                return y=== 0 ? 0.1 : y;
            }) ;

        // Candlestick pattern text
        gElementsList.append('text')
            .attr('y', i => yScale(Yh[i]) - marginBottom)
            .attr('color', i => {
                switch (dCandlePatternType[i]) {
                    case "Bearish":
                        return colors[2];
                    case "Bullish":
                        return colors[0];
                    default:
                        return colors[1];
                }
            })
            .attr('text-anchor', 'middle')
            .style('font', 'normal normal normal 1em Verdana, sans-serif')
            .style("visibility", () =>
                getPatternsVisibility() ? 'visible' : 'hidden'
            )
            .text(i => {
                if (dCandlePattern[i] === "NO_PATTERN")
                    return '';
                else
                    return '*';
            });

        // Compute titles and append it.
        // Create the title popup
//         function getTitleText(date, opens, closes, highs, lows) {
//             const formatDate = d3.utcFormat("%e-%b-%Y  %H:%M");
//             const formatValue = d3.format(".2f");
//             const formatChange = (f => (y0, y1) => f((y1 - y0) / y0))(d3.format("+.2%"));
//
//             const title = i => `${formatDate(date[i])}
// Open: ${formatValue(opens[i])}
// Close: ${formatValue(closes[i])} (${formatChange(opens[i], closes[i])})
// Low: ${formatValue(lows[i])}
// High: ${formatValue(highs[i])}`;
//
//             return title;
//         }
        // const title = getTitleText(xDomain, Yo, Yc, Yh, Yl);
        // gElementsList.append("title")
        //     .text(title);

        // Compute titles and append it.
        addIndicatorTitle(gElementsList, getOverlappingIndicatorsJSON());
    }

    // Create the g for the overlapping functions
    function add_Overlapping_Functions() {
        addIndicatorPaths(container, overlap_functions_json, xScale, yScale);
        container.selectAll('.indicator-line')
            .style("visibility", () =>
                getOverlappingIndicatorsVisibility() ? 'visible' : 'hidden'
            )
    }

    /////

    // CALL THE FUNCTIONS
    //TODO temp
    // add_XAxis_Group(container, xAxis, chartHeight - marginBottom);
    add_XAxis_Group(container, xAxis, 0);

    add_YAxis_Group(container, yAxis, marginLeft, chartWidth - marginLeft - marginRight, yAxisLabel);
    add_CandlesticksData_groups();
    add_Overlapping_Functions();

    switch (getOHCLChartStyle()) {
        case "candlestick":
            container.selectAll(".style_candlestick")
                .attr('visibility', 'visible');
            container.selectAll(".style_linechart")
                .attr('visibility', 'hidden');
            // container.
            break;
        case "linechart":
            container.selectAll(".style_candlestick")
                .attr('visibility', 'hidden');
            container.selectAll(".style_linechart")
                .attr('visibility', 'visible');
            break;
    }
}

function createVolatilityChart(
    volatility_functions_json,
    xDomainAsRange, xScale, xAxis,
    yLow, yHigh,
    marginTop, marginRight, marginLeft, marginBottom,
    chartWidth,
    stroke, strokeLinecap, colors
) {

    // VARIABLES
    const id = "atr";
    const yAxisLabel = '↑ Volatility ($%)';
    const nTicks = yHigh / 80;
    const ticks = undefined;
    const yDomain = [0, Math.ceil(volatility_functions_json['global_max'])]


    // REST OF THE CODE
    genericIndicatorChart(volatility_functions_json,
        xDomainAsRange, xScale, xAxis,
        yLow, yHigh,
        marginTop, marginRight, marginLeft, marginBottom,
        chartWidth,
        stroke, strokeLinecap, colors,
        id, yAxisLabel, nTicks, ticks, yDomain);
}

function createStrengthChart(
    strength_functions_json,
    xDomainAsRange, xScale, xAxis,
    yLow, yHigh,
    marginTop, marginRight, marginLeft, marginBottom,
    chartWidth,
    stroke, strokeLinecap, colors
) {
    // VARIABLES
    const id = "rsi";
    const yAxisLabel = '↑ RSI (%)';
    const nTicks = undefined;
    const ticks = [0, 30, 70, 100];
    const yDomain = [0, 100]

    // REST OF THE CODE
    genericIndicatorChart(strength_functions_json,
        xDomainAsRange, xScale, xAxis,
        yLow, yHigh,
        marginTop, marginRight, marginLeft, marginBottom,
        chartWidth,
        stroke, strokeLinecap, colors,
        id, yAxisLabel, nTicks, ticks, yDomain);
}

function createVolumeChart(
    volume_functions_json,
    xDomainAsRange, xScale, xAxis,
    yLow, yHigh,
    marginTop, marginRight, marginLeft, marginBottom,
    chartWidth,
    stroke, strokeLinecap, colors
) {

    // VARIABLES
    const id = "adosc";
    const yAxisLabel = '↑ Volume';
    const nTicks = yHigh / 100;
    const ticks = undefined;
    const yDomain = [Math.floor(
        Math.min(0, 'global_min' in volume_functions_json ? volume_functions_json['global_min'] : 0)
    ), Math.ceil(volume_functions_json['global_max'])]

    // REST OF THE CODE
    genericIndicatorChart(volume_functions_json,
        xDomainAsRange, xScale, xAxis,
        yLow, yHigh,
        marginTop, marginRight, marginLeft, marginBottom,
        chartWidth,
        stroke, strokeLinecap, colors,
        id, yAxisLabel, nTicks, ticks, yDomain);
}

/////////////////////////////////////////////

function genericIndicatorChart(functions_json,
                               xDomainAsRange, xScale, xAxis,
                               yLow, yHigh,
                               marginTop, marginRight, marginLeft, marginBottom,
                               chartWidth,
                               stroke, strokeLinecap, colors,
                               idChart, yAxisLabel, nTicks, ticks, yDomain) {
    const xDomain = xScale.domain();
    const xPadding = xScale.padding();

    const yRange = [yLow - marginTop, yHigh + marginBottom];

    // Add container
    const container = d3.select('svg').append("g")
        .attr('class', chartsClass)
        .attr('id', idChart);

    // Get yAxis
    const [yScale, yAxis] = getAxisY(yDomain, yRange, nTicks, ticks);

    // TODO temp
    // add_XAxis_Group(container, xAxis, yLow - marginBottom);
    add_YAxis_Group(container, yAxis, marginLeft, chartWidth - marginLeft - marginRight, yAxisLabel);


    function add_indicators_lines() {
        addIndicatorPaths(container, functions_json, xScale, yScale);
    }


    // Create a g to contain the g-data
    const gDataContainer = container
        .append("g")
        .on("mouseover", event => {
            // GET THE G CONTAINER
            let gContainer = d3.select(event.target.parentNode);

            // HIGHLIGHT THE RECTANGLE CONTAINING THE MOUSE POINTER
            highlight_rect_in_current_chart(gContainer, true);

            // DISPLAY THE EXTERNAL TOOLTIP AND UPDATE ITS HTML WITH THE ONE SAVED INTO THE LOCAL
            if (getOverlappingTitlesVisibility()) {
            let local_tooltip = gContainer.select('.tooltip')
            let external_tooltip = d3.select('.tooltip');
            external_tooltip
                .style("left", (event.x) + "px")
                .style("top", (event.y - 32) + "px")
                .style("opacity", .9)
                .html(local_tooltip.html());
            }

            // HIGHLIGHT THE WINDOWS ON THE CANDLESTICK CHART
            highlight_windows_on_candlestick_chart(gContainer, true);
        })
        .on("mouseout", event => {
            let gContainer = d3.select(event.target.parentNode);
            highlight_rect_in_current_chart(gContainer, false);

            // Hide the tooltip
            d3.select('.tooltip').style("opacity", 0);

            // de-HIGHLIGHT THE WINDOWS
            highlight_windows_on_candlestick_chart(gContainer, false);
        })
        .attr('class', 'data-class')
        .attr("stroke", stroke)
        .attr("stroke-linecap", strokeLinecap);

    // Create a group for each data point
    const gElementsList = gDataContainer.selectAll("g")
        .data(xDomainAsRange)
        .join("g")
        .attr('class', i => `data-${i}`)
        .attr("transform", i => `translate(${xScale(xDomain[i])},${yHigh})`);

    // For each group, create a rect as high as the container
    addRects(gElementsList, xScale, xPadding, 0, yLow - yHigh - marginBottom - marginTop);
    add_indicators_lines();


    // Compute titles and append it.
    addIndicatorTitle(gElementsList, functions_json);

}

// COMMON FUNCTIONS /////////////////////////
function addIndicatorPaths(container, functions_json, xScale, yScale) {
    const xDomain = xScale.domain();
    const yDomain = yScale.domain();

    for (const [id, value] of Object.entries(functions_json['functions'])) {
        const name = value['name'];
        const new_data = value['data'];
        const color = value['color'];
        const window_size = value['window_size'];
        const small_window_size = value['small_window_size'];
        const large_window_size = value['large_window_size'];

        container
            .append('path')
            .attr('class', 'indicator-line')
            .attr('id', `${name}-${id}`)
            .datum(new_data)
            .attr("fill", "none")
            .attr('window_size', () => window_size ? window_size : null)
            .attr('small_window_size', () => small_window_size ? small_window_size : null)
            .attr('large_window_size', () => large_window_size ? large_window_size : null)
            .attr("stroke", color)
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
                .x(
                    (d, i) => xScale(xDomain[i])
                )
                .y(d => isNaN(d) || d === 0 ? yScale(yDomain[0]) : yScale(d)
                )
            )
    }
}

function addRects(gList, xScale, xPadding, y, height) {
    gList.append('rect')
        .attr('x', -xScale.bandwidth() - xPadding)
        .attr('y', y)
        .attr('width', xScale.bandwidth() * 2 + xPadding * 2)
        .attr('height', height)
        .attr('stroke-width', '0')
        .attr('fill', 'transparent')
        .attr('class', candlesRectClass)
}

// Create the title popup
function addIndicatorTitle(gList, functions_json) {
    if (Object.keys(functions_json['functions']).length === 0)
        return;

    // const formatDate = d3.utcFormat("%B %-d, %Y");
    const formatValue = d3.format(".2f");
    const formatChange = (f => (y0, y1) => {
        return f((y1 - y0) / y0)
    })(d3.format("+.2%"));

    const titleFun = i => {
        let title = "";
        let title_html = "";
        let tooltip = d3.create('div');
        tooltip.attr('class', 'tooltip');
        // tooltip
        //     .attr('class', 'tooltip')
        //     .attr('visibility', 'hidden')
        // ;
        let j = 0;
        for (const [id, value] of Object.entries(functions_json['functions'])) {
            const name = value['name'];
            const new_data = value['data'];
            const color = value['color'];
            const window_size = value['window_size'];
            const small_window_size = value['small_window_size'];
            const large_window_size = value['large_window_size'];


            title = ` ${formatValue(new_data[i])} (${formatChange(new_data[i - 1], new_data[i])})`
            if (!isNaN(window_size)) {
                title_html += `<p><span style="color:${color};"><b>${name}(${window_size}):</b></span>${title}</p>`;
            } else {
                title_html += `<p><span style="color:${color};"><b>${name}(${small_window_size}-${large_window_size}):</b></span>${title}</p>`;
            }
            j++;
        }
        tooltip.html(title_html)
        return tooltip.node();
    }
    gList.each(function (d, i) {
        d3.select(this).append(() => titleFun(i));
    })
}

function getAxisX(timeframe, xDomain, xRange, xPadding) {
    // If you were to plot a stock using d3.scaleUtc, you’d see distracting gaps
    // every weekend. This chart therefore uses a d3.scaleBand whose domain is every
    // weekday in the dataset. A few gaps remain for holiday weekdays, such as
    // Christmas, but these are infrequent and allow the labeling of Mondays. As a
    // band scale, we specify explicit tick values.
    let ticksRangeFun;
    let xFormat;
    let tickFun;
    let tickStep = 0;
    let oneEleOffset = 0;
    let lastEle = xDomain.slice(-1);
    switch (timeframe) {
        case "1Min":
            xFormat = "%H:%M"; // hour minute
            tickFun = d3.utcMinute;
            oneEleOffset = 1
            tickStep = oneEleOffset * 20;
            break;
        case "15Min":
            xFormat = "%H:%M"; // hour minute
            tickFun = d3.utcMinute;
            oneEleOffset = 15
            tickStep = oneEleOffset * 4;
            break;
        case "1H":
            xFormat = "%I:%M"; // hour minute
            tickFun = d3.utcHour;
            oneEleOffset = 1
            tickStep = oneEleOffset * 6;
            break;
        case "6H":
            xFormat = "%b %d"; // month day
            tickFun = d3.utcHour;
            oneEleOffset = 6
            tickStep = oneEleOffset * 4;
            break;

        case "1D":
            xFormat = "%b %d"; // month day
            tickFun = d3.utcDay
            oneEleOffset = 1
            tickStep = oneEleOffset * 14;
            break;
        case "1W":
            xFormat = "%b %d"; // month day
            tickFun = d3.utcWeek;
            oneEleOffset = 1
            tickStep = oneEleOffset * 4;
            break;
        case "1M":
            xFormat = "%M"; // month
            tickFun = d3.utcMonth;
            oneEleOffset = 1
            tickStep = oneEleOffset * 1;
            break;
    }
    xDomain.push(tickFun.offset(lastEle, oneEleOffset))
    ticksRangeFun = (start, stop) => tickFun.range(start, +stop + 1, tickStep);
    const xTicks = ticksRangeFun(d3.min(xDomain), d3.max(xDomain));

    let xScale = d3.scaleBand(xDomain, xRange).padding(xPadding);
    let xAxis = d3.axisBottom(xScale).tickFormat(d3.utcFormat(xFormat)).tickValues(xTicks).tickPadding(10);
    return [xScale, xAxis];
}

function getAxisY(yDomain, yRange, nTicks, ticks) {
    const yFormat = "~f"; // a format specifier for the value on the y-axis
    const tickPadding = 5;
    const yScale = d3.scaleLinear(yDomain, yRange).nice();
    const yAxis = d3.axisLeft(yScale).tickPadding(tickPadding);
    if (ticks) {
        yAxis.tickValues(ticks);
    } else {
        yAxis.ticks(nTicks, yFormat)
    }

    return [yScale, yAxis];
}


// Create g containing the x-axis (ticks)
function add_XAxis_Group(container, xAxis, low_y) {
    container.append('g')
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${low_y})`)
        .call(xAxis)
        .call(g => g.select(".domain").remove());

    //TODO tmp
    // container
    //     .selectAll("text")
    //     .attr("dx", "-.8em")
    //     .attr("dy", ".15em")
    //     .attr("transform", "rotate(-35)")
    //     .style("text-anchor", "end");
}

// Create g containing the y-axis (horizontal lines)
function add_YAxis_Group(container, yAxis, left_x, right_x, yAxisLabel) {
    const offset_label = 10;
    container.append("g")
        .attr("class", "y-axis")
        .attr("transform", `translate(${left_x},0)`)
        .call(yAxis)
        .call(g => g.select(".domain").remove())
        .call(g => g.selectAll('.tick')
            .attr('transform', d => {
                let y = yAxis.scale()(d);
                return `translate(0,${y})`;
            }))
        .call(g => g.selectAll(".tick line").clone()
            .attr("stroke-opacity", 0.2)
            .attr("x2", right_x))
        .call(g => g.append("text")
            .attr("x", -left_x)
            .attr("y", yAxis.scale()(yAxis.scale().domain()[1]) - offset_label)
            .attr("fill", "currentColor")
            .attr("text-anchor", "start")
            .text(yAxisLabel));
}


function highlight_rect_in_current_chart(container, isHighlighted) {
    container
        .select('.' + candlesRectClass)
        .attr("fill", isHighlighted ? rectHighlightedColor : "transparent");
}

function highlight_windows_on_candlestick_chart(container, turn_on) {
    if (!getIndicatorWindowsVisibility()) return;

    // get the index of the current element => the window is [i-windowSize, i-1]

    // Get the index i of the current element
    let idx = +container.attr('class').split('-')[1];

    // For each path
    container.select(function () {
        return this.parentNode.parentNode;
    }).selectAll("path").each(function (d, i) {
            // Get its window_size and color
            let window_size = d3.select(this).attr("window_size")
            let large_window_size = d3.select(this).attr("large_window_size")
            let small_window_size = d3.select(this).attr("small_window_size")
            let color = turn_on ? d3.select(this).attr("stroke") : 'transparent';

            // The minimum index is 0
            let min_idx


            // Highlight the rects from i-window_size to i-1
            if (_TEMP_SWITCH_WINDOW_MODE) {
                if (window_size)
                    min_idx = Math.max(0, idx - window_size+1)
                else
                    min_idx = Math.max(0, idx - large_window_size+1)
                d3.range(min_idx, idx).map(j =>
                    d3.select(`g#candlestick-container.data-${j} rect`)
                        .attr("fill", color)
                );
            } else {
                let dataContainer = d3.select('g.data-class');
                if (!turn_on) {
                    dataContainer.selectAll('rect#window-rect').remove();
                } else {
                    let firstG;
                    let lastG = d3.select(`g#candlestick-container.data-${idx}`)

                    if (window_size) {
                        min_idx = Math.max(0, idx - window_size+1)
                        let firstG = d3.select(`g#candlestick-container.data-${min_idx}`)
                        f(dataContainer, firstG, lastG, window_size, color);

                    } else {
                        min_idx = Math.max(0, idx - large_window_size+1)
                        firstG = d3.select(`g#candlestick-container.data-${min_idx}`)
                        f(dataContainer, firstG, lastG, window_size, color);

                        min_idx = Math.max(0, idx - small_window_size+1)
                        firstG = d3.select(`g#candlestick-container.data-${min_idx}`)
                        f(dataContainer, firstG, lastG, window_size, color);
                    }
                }
            }
        }
    )
}

function f(dataContainer, firstG, lastG, window_size, color) {
    let firstRect = firstG.select("rect")
    let lastRect = lastG.select("rect")

    let firstX =
        +firstG.attr("transform").split(",")[0].split("(")[1]
        + +firstRect.attr("x")

    let lastX = (+lastG.attr("transform").split(",")[0].split("(")[1])
        + (+lastRect.attr("x"))
        + +lastRect.attr("width")

    dataContainer
        .append('rect')
        .attr('id', 'window-rect')
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 1 / window_size * 40 + .5) // > window_size => < stroke-width
        // .attr("stroke-width", window_size/5)
        // .attr("stroke-width", window_size)
        .attr('x', firstX)
        .attr('y', firstRect.attr('y'))
        .attr('width', lastX - firstX)
        .attr('height', firstRect.attr('height'))
}