var margin = { top: 10, right: 10, bottom: 10, left: 10 },
    width = 800 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

const color = d3.scaleOrdinal([
    "#B71C1C", "#D32F2F", "#C2185B",
    "#388E3C", "#2C6B2F", "#1B5E20",
    "#0D47A1", "#1976D2", "#1565C0"  
]);
    

let selectedYear = "2018";
let selectedDistrict = d3.select("#districtSelect").property("value"); // Get initial district value
var countThreshold = 9000;

const tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("background", "rgba(0, 0, 0, 0.8)")
    .style("color", "white")
    .style("padding", "8px")
    .style("border-radius", "5px")
    .style("font-size", "14px")
    .style("pointer-events", "none")
    .style("opacity", 0);

const svg = d3.select('#vis')
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

d3.csv("./data/crimes_cleaned.csv").then(function (data) {
    // Debug log total data length
    console.log("Total data records:", data.length);

    const districts = Array.from(new Set(data.map(d => d.District))).sort((a, b) => +a - +b);
    const districtSelect = d3.select("#districtSelect");
    districts.forEach(district => {
        districtSelect.append("option")
            .attr("value", district)
            .text(`District ${district}`);
    });

    function processDataForYear(year, districtFilter) {
        console.log(year)
        let filteredData = data.filter(d => d.Year === year);
        console.log(`Data filtered by year ${year}:`, filteredData.length);
        if (districtFilter !== "ALL") {
            countThreshold = 400 // Change Threshold in proportion to data cutting size
            filteredData = filteredData.filter(d => String(d.District) === districtFilter);
            console.log(`Data filtered by district (${districtFilter}):`, filteredData.length);
        }
        else{
            countThreshold = 9000
        }
        
        var aggregated = Array.from(
            d3.rollup(filteredData,
                v => v.length,
                d => d["Primary Type"]
            ),
            ([Type, count]) => ({ Type, count })
        );
        console.log("Aggregated data (by Primary Type):", aggregated);
        aggregated = aggregated.sort((a, b) => b.count - a.count);

        const arrestCounts = aggregated.map(d => {
            const crimeTypeData = filteredData.filter(f => f["Primary Type"] === d.Type);
            const trueArrests = crimeTypeData.filter(f => f.Arrest === "True").length;
            const falseArrests = crimeTypeData.filter(f => f.Arrest === "False").length;
            return {
                Type: d.Type,
                count: d.count,
                trueArrests: trueArrests,
                falseArrests: falseArrests
            };
        });
        console.log("Arrest counts:", arrestCounts);

        // Apply the count threshold filter
        const filteredArrests = arrestCounts.filter(d => d.count >= countThreshold);
        console.log("After applying count threshold (" + countThreshold + "):", filteredArrests);

        if(filteredArrests.length === 0) {
            console.log("No data available for selected filters.");
            svg.selectAll("*").remove();
            svg.append("text")
                .attr("x", width / 2)
                .attr("y", height / 2)
                .attr("text-anchor", "middle")
                .text("No data available")
                .style("fill", "black");
            return;
        }

        // Build hierarchy data for treemap
        const hierarchyData = [
            { id: "root", parent: "" },
            ...filteredArrests.map(d => ({
                id: d.Type,
                parent: "root",
                value: d.count
            }))
        ];
        console.log("Hierarchy data:", hierarchyData);

        const rootNode = d3.stratify()
            .id(d => d.id)
            .parentId(d => d.parent)
            (hierarchyData)
            .sum(d => d.value || 0);
        console.log("Stratified root node:", rootNode);

        d3.treemap()
            .size([width, height])
            .padding(4)
            (rootNode);

        svg.selectAll("rect")
            .transition().duration(500)
            .style("opacity", 0)
            .remove();
        svg.selectAll("text")
            .transition().duration(500)
            .style("opacity", 0)
            .remove();
        svg.selectAll("text.arrestInfo")
            .transition().duration(500)
            .style("opacity", 0)
            .remove();

        svg.selectAll("rect")
            .data(rootNode.leaves())
            .join(
                enter => enter
                    .append("rect")
                    .attr("x", d => d.x0)
                    .attr("y", d => d.y0)
                    .attr("width", 0)
                    .attr("height", 0)
                    .style("stroke", "black")
                    .style("fill", d => color(d.data.id))
                    .style("opacity", 0)
                    .transition().duration(800)
                    .style("opacity", 1)
                    .attr("width", d => d.x1 - d.x0)
                    .attr("height", d => d.y1 - d.y0),
                update => update
                    .transition().duration(800)
                    .style("opacity", 1)
                    .attr("x", d => d.x0)
                    .attr("y", d => d.y0)
                    .attr("width", d => d.x1 - d.x0)
                    .attr("height", d => d.y1 - d.y0),
                exit => exit
                    .transition().duration(500)
                    .style("opacity", 0)
                    .remove()
            )
            .on("mouseover", (event, d) => {
                const originalColor = color(d.data.id);
                const darkerColor = d3.rgb(originalColor).darker(0.2);
                d3.select(event.target).style("fill", darkerColor);
                const arrestData = arrestCounts.find(item => item.Type === d.data.id);
                if (arrestData) {
                    const totalArrests = arrestData.trueArrests + arrestData.falseArrests;
                    const trueArrestsPercentage = totalArrests > 0 ? (arrestData.trueArrests / totalArrests * 100).toFixed(2) : 0;
                    tooltip.transition().duration(300).style("opacity", 1);
                    tooltip.html(`<strong>${d.data.id}</strong><br>Count: ${d.data.value}<br>True Arrests: ${arrestData.trueArrests}<br>False Arrests: ${arrestData.falseArrests}<br>True Arrests Percentage: ${trueArrestsPercentage}%`);
                }
            })
            .on("mousemove", (event) => {
                tooltip.style("left", (event.pageX + 10) + "px")
                       .style("top", (event.pageY + 10) + "px");
            })
            .on("mouseout", (event, d) => {
                d3.select(event.target).style("fill", color(d.data.id));
                tooltip.transition().duration(500).style("opacity", 0);
            });

        svg.selectAll("text")
            .data(rootNode.leaves())
            .join("text")
            .attr("x", d => Math.max(d.x0 + 5, 0))
            .attr("y", d => Math.max(d.y0 + 20, 0))
            .text(d => d.data.id)
            .style("fill", "white")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("opacity", 0)
            .transition().duration(800)
            .style("opacity", 1);

       
        svg.selectAll("text.arrestInfo")
            .data(rootNode.leaves())
            .join("text")
            .attr("id", d => `arrestText-${d.data.id}`)
            .attr("x", d => Math.max(d.x0 + 5, 0))
            .attr("y", d => Math.max(d.y0 + 30, 0))
            .style("opacity", 0)
            .attr("fill", "white")
            .style("text-anchor", "start")
            .style("dominant-baseline", "middle")
            .transition().duration(800)
            .style("opacity", 1);
    }

    // Initialize with 2018 data and ALL districts
    processDataForYear("2018", "ALL");

    // Create a wrapper for the slider and year label
    const sliderWrapper = d3.select("body").append("div")
        .style("text-align", "center")
        .style("margin-bottom", "20px");

    // Create a slider for year selection inside the wrapper
    const slider = sliderWrapper.append("input")
        .attr("type", "range")
        .attr("min", 2018)
        .attr("max", 2022)
        .attr("step", 1)
        .attr("value", 2018)
        .style("width", "80%");

   
    const yearLabel = sliderWrapper.append("span")
        .style("display", "block")
        .style("margin-top", "10px")
        .text("Year: 2018");


    
    processDataForYear(selectedYear, selectedDistrict);

    slider.on("input", function() {
        selectedYear = this.value; // Update the global year value
        yearLabel.text("Year: " + selectedYear);
        processDataForYear(selectedYear, selectedDistrict); // Use global selectedYear and current district
    });

    d3.select("#districtSelect").on("change", function() {
        selectedDistrict = this.value; // Get the new district value
        processDataForYear(selectedYear, selectedDistrict); 
        console.log("New Year from global variable: " + selectedYear); // Debuggging
    });

});
