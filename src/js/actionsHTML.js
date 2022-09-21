function setPatternsVisibilityHTML(isChecked) {
    setPatternsVisibility(isChecked)
    updateRendering()
}

function setOverlappingIndicatorsVisibilityHTML(isChecked) {
    setOverlappingIndicatorsVisibility(isChecked)
    updateRendering()
}

function setIndicatorWindowsVisibilityHTML(isChecked) {
    setIndicatorWindowsVisibility(isChecked)
    updateRendering()
}

function addIndicatorFunctionHTML(funName, funWindowsSize) {
    addIndicatorFunction(funName, funWindowsSize)
    updateRendering()
}

function setOHCLChartStyleHTML(event) {
    let style = event.target.value
    console.log("setOHCLChartStyle: before | " + getOHCLChartStyle())
    setOHCLChartStyle(style)
    console.log("setOHCLChartStyle: after | " + getOHCLChartStyle())
    updateRendering()
}