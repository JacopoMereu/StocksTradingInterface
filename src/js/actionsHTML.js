function mainMenu() {
    // Credits: https://www.w3schools.com/howto/howto_js_collapsible.asp
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