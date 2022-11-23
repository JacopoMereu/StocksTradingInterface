// COMMON ID
const sliderSampleSize = 'sliderSampleSize'
const selectSampleSize = 'selectSampleSize';

///////////////////////// MENU SET AND UPDATE //////////////////////////////
function mainMenu_SetStaticElements() {
    // Credits: https://www.w3schools.com/howto/howto_js_collapsible.asp
    function toggleCollapsibles() {
        const coll = document.getElementsByClassName("collapsible");

        for (let i = 0; i < coll.length; i++) {
            coll[i].addEventListener("click", function () {
                this.classList.toggle("active");
                let content = this.nextElementSibling;
                if (content.style.maxHeight) {
                    content.style.maxHeight = null;
                } else {
                    content.style.maxHeight = content.scrollHeight + "px";
                }
            });
        }
    }

    toggleCollapsibles()
}

function numericInput(input) {
    // Credits: https://stackoverflow.com/questions/41444813/validation-for-input-type-number-with-minimum-and-maximum-range
    if (input.type === "number" && input.max && input.min) {
        console.log("min", input.min, "max", input.max, "value", input.value)
        let value = +input.value
        // input.value = value // for 000 like input cleanup to 0
        console.log(input.value)
        let max = +input.max
        let min = +input.min
        if (value > max) input.value = input.max
        if (value < min) input.value = input.min
        setDataSampleSize(input.value)
        updateData()
    }
}

function mainMenu_UpdateDynamicElements(data) {
    function updateSampleSize() {
        const input = document.getElementById(selectSampleSize);
        const new_max = data.length;
        const new_value = Math.min(new_max, getDataSampleSize());

        setDataSampleSize(new_value)

        input.max = new_max;
        input.value = new_value;
        document.getElementById('labelSampleSize').innerText = new_max
    }

    updateSampleSize()
}

function setDropdownOptionsHTML(json_header) {
    const idDatasetDropdown = "#selectButton"
    const idTimeframeDropdown = '#selectFrameTime'

    function addTextsOptions(dropdown, data) {
        dropdown
            .selectAll('myOptions')
            .data(data)
            .enter()
            .append('option')
            .text(function (d) {
                return d;
            }) // text showed in the menu
            .attr("value", function (d) {
                return d;
            }) // corresponding value returned by the button
    }

    // DATASET
    const datasetNames = Object.keys(json_header)

    d3.select(idDatasetDropdown)
        // on change load the new dataset
        .on('change', event => {
            const new_data_filename = event.target.value;
            const old_data_timeframe = d3.select(idTimeframeDropdown).property('value');
            load_data(new_data_filename, old_data_timeframe)
        })
        .call(dropdown => addTextsOptions(dropdown, datasetNames))


    // TIMEFRAME
    const timeframeNames = json_header[datasetNames[0]].map(f => f['timeframe'])
    d3.select(idTimeframeDropdown)
        // on change load the new dataset
        .on('change', event => {
            const old_data_filename = d3.select(idDatasetDropdown).property('value');
            const new_data_timeframe = event.target.value;
            load_data(old_data_filename, new_data_timeframe)
        })
        .call(dropdown => addTextsOptions(dropdown, timeframeNames))

    const default_filename = d3.select(idDatasetDropdown).property('value')
    const default_timeframe = d3.select(idTimeframeDropdown).property('value')
    return [default_filename, default_timeframe]
}

///////////////////////////////////////////////////////////////////


////////////////////// HTML Actions ////////////////////////////////
function setColorsHTML(colors) {
    setColors(colors)
    updateRendering()
}

function setPatternsVisibilityHTML(isChecked) {
    setPatternsVisibility(isChecked)
    updateRendering()
}

function setOverlappingIndicatorsVisibilityHTML(isChecked) {
    setOverlappingIndicatorsVisibility(isChecked)
    updateRendering()
}

function setOverlappingTitlesVisibilityHTML(isChecked) {
    setOverlappingTitlesVisibility(isChecked)
    updateRendering()
}

function setIndicatorWindowsVisibilityHTML(isChecked) {
    setIndicatorWindowsVisibility(isChecked)
    updateRendering()
}

function changeInputFieldBasedOnFunctionHTML(value, window, small_window, large_window) {
    if (value === "ADOSC") {
        window.style.display = "none";
        small_window.style.display = "inline";
        large_window.style.display = "inline";
    } else {
        window.style.display = "inline";
        small_window.style.display = "none";
        large_window.style.display = "none";
    }
    console.log(value, window, small_window, large_window)
}

function addIndicatorFunctionHTML(funName, funWindowsSize = undefined, funSmallWindow = undefined, funLargeWindow = undefined) {
    if (!(funWindowsSize || (funSmallWindow && funLargeWindow))) {
        alert("Please enter a valid number for the window size")
        return;
    }
    addIndicatorFunction(funName, funWindowsSize, funSmallWindow, funLargeWindow)
    updateRendering()
}

function setOHCLChartStyleHTML(event) {
    let style = event.target.value
    setOHCLChartStyle(style)
    updateRendering()
}

///////////////////////////////////////////////////////////////////