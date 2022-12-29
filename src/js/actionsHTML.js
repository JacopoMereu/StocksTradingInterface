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

function numericInputValidation(input) {
    // Credits: https://stackoverflow.com/questions/41444813/validation-for-input-type-number-with-minimum-and-maximum-range
    if (input.type === "number" && input.max && input.min) {
        const numberField = d3.select(input)
        const oldValue = numberField.attr('value');

        let newValue = +input.value
        if (oldValue === newValue) return;

        let max = +input.max
        let min = +input.min
        if (newValue > max) newValue = max
        if (newValue < min) newValue = min
        // numberField.attr('value', newValue)
        input.value = newValue.toString()
    } else {
        alert("Please enter a valid number")
    }

}

function setDataSampleSizeHTML(input) {
    if (+input.value !== getDataSampleSize()) {
        setDataSampleSize(+input.value)
        updateNDataRendered()
    }
    else {
        alert("Please enter a different number")
    }
}
function mainMenu_UpdateDynamicElements() {
    const non_sliced_data = _curr_data;

    function updateSampleSizeAfterDatasetUpdate() {
        const nData_LabelHTML = document.getElementById('labelSampleSize');
        const nDataWanted_InputFieldHTML = document.getElementById(selectSampleSize);

        const new_nData = non_sliced_data.length;
        const old_nDataWanted = getDataSampleSize();
        const new_nDataWanted = Math.min(new_nData, old_nDataWanted);

        setDataSampleSize(new_nDataWanted)

        nDataWanted_InputFieldHTML.max = new_nData;
        nDataWanted_InputFieldHTML.value = new_nDataWanted;
        nData_LabelHTML.innerText = new_nData.toString()
    }

    // function updateActionOptions() {
    //     const idDropdownHighlightRSIPoints = 'selectRSIHighlight';
    //
    //     // update RSI highlight options with the RSI functions
    //     console.log(getStrengthIndicatorsJSON())
    //
    //     /**/
    //     function addTextsOptions(dropdown, data) {
    //         dropdown
    //             .selectAll('myOptions')
    //             .data(data)
    //             .enter()
    //             .append('option')
    //             .text(function (d) {
    //                 return d;
    //             }) // text showed in the menu
    //             .attr("value", function (d) {
    //                 return d;
    //             }) // corresponding value returned by the button
    //     }
    //
    //     // DATASET
    //     const datasetNames = Object.keys(json_header)
    //
    //     d3.select(idDropdownHighlightRSIPoints)
    //         // on dropdownHighlightRSIPoints load the new dataset
    //         .on('change', event => {
    //             // const new_data_filename = event.target.value;
    //             // const old_data_timeframe = d3.select(idTimeframeDropdown).property('value');
    //             // load_data(new_data_filename, old_data_timeframe)
    //         })
    //         .call(dropdown => addTextsOptions(dropdown, datasetNames))
    //     /**/
    //
    // }

    ///// Calling all the functions
    updateSampleSizeAfterDatasetUpdate()
    // updateActionOptions()
}

function setDatasetDropdownOptionsHTML(json_header) {
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
    updateGraphRendering()
}

function setPatternsVisibilityHTML(isChecked) {
    setPatternsVisibility(isChecked)
    updateGraphRendering()
}

function setOverlappingIndicatorsVisibilityHTML(isChecked) {
    setOverlappingIndicatorsVisibility(isChecked)
    updateGraphRendering()
}

function setHighlightClosestPathToMouseHTML(isChecked) {
    setHighlightClosestPathToMouse(isChecked)
    updateGraphRendering()
}
function setOverlappingTitlesVisibilityHTML(isChecked) {
    setOverlappingTitlesVisibility(isChecked)
    updateGraphRendering()
}

function setIndicatorWindowsVisibilityHTML(isChecked) {
    setIndicatorWindowsVisibility(isChecked)
    updateGraphRendering()
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
    updateGraphRendering()
}

function setOHCLChartStyleHTML(event) {
    let style = event.target.value
    setOHCLChartStyle(style)
    updateGraphRendering()
}

///////////////////////////////////////////////////////////////////