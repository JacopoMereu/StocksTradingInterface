// Copyright 2021 Observable, Inc.
// Released under the ISC license.
// https://observablehq.com/@d3/candlestick-chart


const candlesRectClass = 'rect-class';
const chartsClass = "candles-class";
const rectHighlightedColor = "#add8e6";

function mainRender(
    data,
    {
        date = d => d.date, // given d in data, returns the (temporal) x-value
        open = d => d.open, // given d in data, returns a (quantitative) y-value
        close = d => d.close, // given d in data, returns a (quantitative) y-value
        high = d => d.high, // given d in data, returns a (quantitative) y-value
        low = d => d.low, // given d in data, returns a (quantitative) y-value
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
    let currHigh = height;
    let currLow = 0;

    const xDomain = data.map(date);
    const xRange = [marginLeft, chartWidth - marginRight]; // [left, right]

    const Yo = data.map(open);
    const Yc = data.map(close);
    const Yh = data.map(high);
    const Yl = data.map(low);
    const xDomainAsRange = d3.range(Yl.length); // add a candle for the next day

    const dCandlePattern = data.map(d => d.candlestick_pattern);
    const dCandlePatternType = data.map(d => d.candlestick_pattern_type);

    // Get xAxis
    const [xScale, xAxis] = getAxisX(timeframe, xDomain, xRange, xPadding);

    createCandlestickChart(
        Yo,
        Yc,
        Yl,
        Yh,
        timeframe,
        dCandlePattern,
        dCandlePatternType,

        xScale, xAxis,
        marginTop, marginRight, marginLeft, marginBottom,
        chartWidth, height * 0.8,
        stroke, strokeLinecap, colors,
        getOverlappingIndicatorsJSON());

    ////// Create a second graph below the first one: ATR //////
    prevLow = currLow;
    prevHigh = currHigh;
    currLow = prevHigh * 0.8;
    currHigh = prevHigh * 1;


    createVolatilityChart(
        getVolatilityIndicatorsJSON(),
        xDomainAsRange, xScale, xAxis,
        currHigh, currLow,
        marginTop, marginRight, marginLeft, marginBottom,
        chartWidth,
        stroke, strokeLinecap, colors);

    ////// Create third diagram: RSI //////
    prevLow = currLow;
    prevHigh = currHigh;
    currHigh = prevHigh;
    currLow = currHigh * 1.2;

    createStrengthChart(
        getStrengthIndicatorsJSON(),
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
    // Create the title popup
    function getTitleText(date, opens, closes, highs, lows) {
        const formatDate = d3.utcFormat("%B %-d, %Y");
        const formatValue = d3.format(".2f");
        const formatChange = (f => (y0, y1) => f((y1 - y0) / y0))(d3.format("+.2%"));

        const title = i => `${formatDate(date[i])}
Open: ${formatValue(opens[i])}
Close: ${formatValue(closes[i])} (${formatChange(opens[i], closes[i])})
Low: ${formatValue(lows[i])}
High: ${formatValue(highs[i])}`;

        return title;
    }

    // Create the gs containing the candlesticks data and add the data
    function add_CandlesticksData_groups() {
        const gElementsList = container
            .append("g")
            .on("mouseover", event => {
                let gContainer =  d3.select(event.target.parentNode);

                highlight_rect_in_current_chart(gContainer, true);

                let a = gContainer.selectAll('text');
                if (a.text() !== "") a.text(i => dCandlePattern[i]);
            })
            .on("mouseout", event => {
                let gContainer =  d3.select(event.target.parentNode);

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
            .attr("transform", i => `translate(${xScale(xDomain[i])},${0})`);

        // Create a rect as high as the container
        addRects(gElementsList, xScale, xPadding, marginTop,chartHeight - marginBottom - marginTop);


        // Shadow of the candle
        gElementsList.append("line")
            .attr("y1", i => {
                return yScale(Yl[i])
            })
            .attr("y2", i => yScale(Yh[i]));

        // Real body of the candle
        gElementsList.append("line")
            .attr("y1", i => yScale(Yo[i]))
            .attr("y2", i => yScale(Yc[i]))
            .attr("stroke-width", xScale.bandwidth())
            .attr("stroke", i => colors[1 + Math.sign(Yo[i] - Yc[i])]);

        // Candlestick pattern text
        gElementsList.append('text')
            .attr('y', i => yScale(Yh[i]) - marginBottom)
            .attr('color', i => {
                switch (dCandlePatternType[i]) {
                    case "Bearish":
                        return 'red';
                    case "Bullish":
                        return 'green';
                    default:
                        return 'orange';
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
        const title = getTitleText(xDomain, Yo, Yc, Yh, Yl);
        gElementsList.append("title")
            .text(title);

    }

    // Create the g for the overlapping functions
    function add_Overlapping_Functions() {
        addPaths(container, overlap_functions_json, xScale, yScale);
        container.selectAll('path')
            .style("visibility", () =>
                getOverlappingIndicatorsVisibility() ? 'visible' : 'hidden'
            )
    }

    /////

    // CALL THE FUNCTIONS
    add_XAxis_Group(container, xAxis, chartHeight - marginBottom);
    add_YAxis_Group(container, yAxis, marginLeft, chartWidth - marginLeft - marginRight, yAxisLabel);
    add_CandlesticksData_groups();
    add_Overlapping_Functions();
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
    const yDomain = [Math.floor(0), Math.ceil(volatility_functions_json['global_max'])]


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

    add_XAxis_Group(container, xAxis, yLow - marginBottom);
    add_YAxis_Group(container, yAxis, marginLeft, chartWidth - marginLeft - marginRight, yAxisLabel);


    function add_indicators_lines() {
        addPaths(container, functions_json, xScale, yScale);
    }


    // Create a g to contain the g-data
    const gDataContainer = container
        .append("g")
        .on("mouseover", event => {
            // highlight rect in atr
            let gContainer = d3.select(event.target.parentNode);
            highlight_rect_in_current_chart(gContainer, true);

            let localT = gContainer
                .select('.tooltip')

            // Display the tooltip and update its data
            let tooltip = d3.select('.tooltip');
            tooltip
                .style("left", (event.x) + "px")
                .style("top",  (event.y - 32) + "px")
                .style("opacity", .9)
                .html(localT.html());

            // HIGHLIGHT THE WINDOWS
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
    addRects(gElementsList, xScale, xPadding, 0,yLow - yHigh)
    add_indicators_lines();


    // Compute titles and append it.
    addIndicatorTitle(gElementsList, functions_json);

}

// COMMON FUNCTIONS /////////////////////////
function addPaths(container, functions_json, xScale, yScale) {
    const xDomain = xScale.domain();
    const yDomain = yScale.domain();

    for (const [id, value] of Object.entries(functions_json['functions'])) {
        const name = value['name'];
        const new_data = value['data'];
        const color = value['color'];
        const window_size = value['window_size'];

        container
            .append('path')
            .attr('class', name)
            .attr('id', `${name}-${id}`)
            .datum(new_data)
            .attr("fill", "none")
            .attr('window_size', window_size)
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

    const formatDate = d3.utcFormat("%B %-d, %Y");
    const formatValue = d3.format(".2f");
    const formatChange = (f => (y0, y1) => {
        return f((y1 - y0) / y0)
    })(d3.format("+.2%"));

    const titleFun = i => {
        let title = ""; let title_html = "";
        let tooltip = d3.create('div');
        tooltip.attr('class', 'tooltip');
        // tooltip
        //     .attr('class', 'tooltip')
        //     .attr('visibility', 'hidden')
        // ;
        let j=0;
        for (const [id, value] of Object.entries(functions_json['functions'])) {
            const name = value['name'];
            const new_data = value['data'];
            const color = value['color'];
            const window_size = value['window_size'];

            title = ` ${formatValue(new_data[i])} (${formatChange(new_data[i - 1], new_data[i])})`
            title_html += `<p><span style="color:${color};"><b>${name}(${window_size}):</b></span>${title}</p>`;
        j++;
        }
        tooltip.html(title_html)
        return tooltip.node();
    }
// gList.append(i=>{return titleFun(i)});
gList.each(function (d, i) {
    d3.select(this).append(() => titleFun(i));
})

    // gList.append('g')
    //     .selectAll('text')
    //     .data(d3.range(Object.keys(functions_json['functions']).length))
    //     .enter()
    //     .text(i=>{console.log(i)});

    // gList.append("div")
    //     .style("visibility", "hidden")
    //     .style("background-color", "black")
    //     .style("border", "solid")
    //     .style("border-width", "1px")
    //     .style("border-radius", "5px")
    //     .style("padding", "10px")
    //     .html("<p>I'm a tooltip written in HTML</p><br>Fancy<br><span style='font-size: 40px;'>Isn't it?</span>");

    //${formatDate(date[i])}

}

function getAxisX(timeframe, xDomain, xRange, xPadding) {
    // If you were to plot a stock using d3.scaleUtc, you’d see distracting gaps
    // every weekend. This chart therefore uses a d3.scaleBand whose domain is every
    // weekday in the dataset. A few gaps remain for holiday weekdays, such as
    // Christmas, but these are infrequent and allow the labeling of Mondays. As a
    // band scale, we specify explicit tick values.
    let ticksRangeFun;
    let datesRangeFun;
    let xFormat;
    let tickFun;
    let tickStep;
    switch (timeframe) {
        case "15Min":
            ticksRangeFun = (start, stop) => d3.utcMinute.range(start, +stop + 1, 90);
            xFormat = "%H:%M"; // hour minute
            tickFun = d3.utcMinute;
            tickStep = 90;
            break;
        case "1H":
            ticksRangeFun = (start, stop) => d3.utcHour.range(start, +stop + 1, 3);
            datesRangeFun = (start, stop) => d3.utcHours(start, +stop + 1);
            xFormat = "%I:%M"; // hour minute
            tickFun = d3.utcHour;
            tickStep = 3;
            break;
        case "6H":
            ticksRangeFun = (start, stop) => d3.utcHour.range(start, +stop + 1, 24);
            xFormat = "%b %d"; // month day
            break;

        case "1D":
            ticksRangeFun = (start, stop) => d3.utcDay.range(start, +stop + 1, 14);
            // xDomain.push(d3.utcDay.offset(new Date(),1))
            xFormat = "%b %d"; // month day
            break;
        case "1W":
            ticksRangeFun = (start, stop) => d3.utcWeek.range(start, +stop + 1, 4);
            xFormat = "%b %d"; // hour minute
            break;
        case "1M":
            ticksRangeFun = (start, stop) => d3.utcMonth.range(start, +stop + 1);
            xFormat = "%M"; // hour minute
            break;
    }

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
        .call(g => g.select(".domain").remove())
        .selectAll("text")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-35)")
        .style("text-anchor", "end");
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
        let color = turn_on ? d3.select(this).attr("stroke") : 'transparent';
        // The minimum index is 0
        let min_idx = Math.max(0, idx - window_size);
        // Highlight the rects from i-window_size to i-1
        d3.range(min_idx, idx)
            .map(j => d3.selectAll(`g#candlestick-container.data-${j} rect`)
                .attr("fill", color));
    })
}