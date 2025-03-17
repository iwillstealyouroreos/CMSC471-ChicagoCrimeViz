const margin = { top: 80, right: 60, bottom: 60, left: 100 };
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

let allData = []
let xScale, yScale, sizeScale
let xVar = 'income', yVar = 'lifeExp', sizeVar = 'population', targetYear = 2000

//const continents = ['Africa', 'Asia', 'Oceania', 'Americas', 'Europe']
//const colorScale = d3.scaleOrdinal(continents, d3.schemeSet2); // d3.schemeSet2 is a set of predefined colors. 

//const options = ['income', 'lifeExp', 'gdp', 'population', 'childDeaths']

// Overall Goal is to show the increase in violence and crime in Chicago over time before and after covid
const t = 1000; // 1000ms = 1 second

function init(){
    //console.log('init')
    d3.csv("./data/crimes_filtered.csv", d => ({ 
        id: +d.ID, // unique identifier for each crime
        caseNumber: d.CaseNumber,
        date: new Date(d.Date),
        block: d.Block,
        iucr: d.IUCR, // International Uniform Crime Reporting
        primaryType: d['Primary Type'],
        description: d.Description,
        locationDescription: d['Location Description'],
        arrest: d.Arrest === 'true',
        domestic: d.Domestic === 'true',
        beat: +d.Beat,
        district: +d.District,
        ward: +d.Ward,
        communityArea: +d['Community Area'],
        fbiCode: d['FBI Code'],
        xCoordinate: +d['X Coordinate'],
        yCoordinate: +d['Y Coordinate'],
        year: +d.Year,
        //updatedOn: new Date(d['Updated On']),
        latitude: +d.Latitude,
        longitude: +d.Longitude,
        location: d.Location,
        historicalWards: d['Historical Wards 2003-2015'],
        zipCodes: d['Zip Codes'],
        communityAreas: d['Community Areas'],
        censusTracts: d['Census Tracts'],
        wards: d.Wards,
        boundariesZipCodes: d['Boundaries - ZIP Codes'],
        policeDistricts: d['Police Districts'],
        policeBeats: d['Police Beats']
        // ... same lines as above
    }))
    .then(data => {
            console.log(data) // Check the structure in the console
            allData = data // Save the processed data
            setupSelector()
            
            // Initial rendering steps:
            // P.S. You could move these into setupSelector(), 
            // but calling them separately makes the flow clearer.
            updateAxes()
            updateVis()
            addLegend()
            // placeholder for building vis
            // placeholder for adding listerners
        })
    .catch(error => console.error('Error loading data:', error));
}
//window.addEventListener('load', init);

function setupSelector(){
    // Handles UI changes (sliders, dropdowns)
    // Anytime the user tweaks something, this function reacts.
    // May need to call updateAxes() and updateVis() here when needed!

    let slider = d3
        .sliderHorizontal()
        .min(d3.min(allData.map(d => +d.year))) // setup the range
        .max(d3.max(allData.map(d => +d.year))) // setup the range
        .step(1)
        .width(width)  // Widen the slider if needed
        .displayValue(false)
        .on('onchange', (val) => {
            targetYear = +val // Update the year
            updateVis() // Refresh the chart
        });

    d3.selectAll('.variable')
        // loop over each dropdown button
        .each(function() {
            d3.select(this).selectAll('myOptions')
            .data(options)
            .enter()
            .append('option')
            .text(d => d) // The displayed text
            .attr("value",d => d) // The actual value used in the code
    })
    .on("change", function (event) {
        let id = d3.select(this).property("id");
        let value = d3.select(this).property("value");
    
        console.log(id);
        console.log(value);
    
        if (id === "xVariable") {
            xVar = value;
        } else if (id === "yVariable") {
            yVar = value;
        } else if (id === "sizeVariable") {
            sizeVar = value;
        }
        
        updateAxes();
        updateVis();
    })
    d3.select('#slider')
    .append('svg')
    .attr('width', width)  // Adjust width if needed
    .attr('height', 100)
    .append('g')
    .attr('transform', 'translate(30,30)')
    .call(slider); 

    
    d3.select('#xVariable').property('value', xVar)
    d3.select('#yVariable').property('value', yVar)
    d3.select('#sizeVariable').property('value', sizeVar)

}
  
function updateAxes(){
    // Draws the x-axis and y-axis
    // Adds ticks, labels, and makes sure everything lines up nicely

    // TODO: issue with scaling
    svg.selectAll('.axis').remove()
    svg.selectAll('.labels').remove()

    xScale = d3.scaleLinear()
        .domain([0, d3.max(allData, d => d[xVar])])
        .range([0, width]);
    const xAxis = d3.axisBottom(xScale)

    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`) // Position at the bottom
    .call(xAxis);

    
    yScale = d3.scaleLinear()
        .domain([d3.max(allData, d => d[yVar]), 0])
        .range([0, height])
    const yAxis = d3.axisLeft(yScale)

    svg.append("g")
        .attr("class", "axis")
    .call(yAxis);

    sizeScale = d3.scaleSqrt()
        .domain([0, d3.max(allData, d => d[sizeVar])]) // Largest bubble = largest data point 
        .range([5, 20]); // Feel free to tweak these values if you want bigger or smaller bubbles

    // X-axis label
    svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 20)
    .attr("text-anchor", "middle")
    .text(xVar) // Displays the current x-axis variable
    .attr('class', 'labels')

    // Y-axis label (rotated)
    svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 40)
    .attr("text-anchor", "middle")
    .text(yVar) // Displays the current y-axis variable
    .attr('class', 'labels')

}
  
function updateVis(){
    let currentData = allData.filter(d => d.year === targetYear)
    
    svg.selectAll('.points')
    .data(currentData, d => d.country)
    .join(
        // Enter: When new bubbles are added
            function (enter) {
                return enter
                    .append('circle')
                    .attr('class', 'points')
                    .attr('cx', d => xScale(d[xVar]))
                    .attr('cy', d => yScale(d[yVar]))
                    .style('fill', d => colorScale(d.continent))
                    .style('opacity', .5)
                    .attr('r', 0) // before transition r = 0
                    .on('mouseover', function (event, d) {
                        console.log(d) // See the data point in the console for debugging
                        d3.select(this) // Refers to the hovered circle
                        .style('stroke', 'black')
                        .style('stroke-width', '4px')
                        d3.select('#tooltip')
                        // if you change opacity to hide it, you should also change opacity here
                        .style("display", 'block') // Make the tooltip visible
                        .html( // Change the html content of the <div> directly
                        `<strong>${d.country}</strong><br/>
                        Continent: ${d.continent}`)
                        .style("left", (event.pageX + 20) + "px")
                        .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function (event, d) {
                        d3.select('#tooltip')
                        .style('display', 'none') // Hide tooltip when cursor leaves
                        d3.select(this) // Refers to the hovered circle
                        .style('stroke', 'none')
                    })
                    .transition(t) // Animate the transition
                    .attr('r', d => sizeScale(d[sizeVar])) // Expand to target size
            },
            // Update: When existing bubbles need to move or resize
            function (update) {
                return update
                    // Smoothly move to new positions/sizes
                    .transition(t)
                    .attr('cx', d => xScale(d[xVar]))
                    .attr('cy', d => yScale(d[yVar]))
                    .attr('r', d => sizeScale(d[sizeVar]))

            },
            // Exit: When bubbles need to be removed
            function (exit) {
                exit
                .transition(t)
                .attr('r', 0)  // Shrink to radius 0
                .remove()  // Then remove the bubble
            }
    )
 
    
}
  
function addLegend(){
   // Adds a legend so users can decode colors
    let size = 10  

    // Your turn, draw a set of rectangles using D3
    svg.selectAll('continentSquare')
           
        .data(continents) 
        .enter() 
        .append('rect') 
        .attr('x', (d, i) => i * (size + 100) + 100)
        .attr('y', -margin.top / 2) 
        .attr('width', 10)
        .attr('height', 10)
        .style('fill', d => colorScale(d)); 
    // data here should be "continents", which we've defined as a global variable
    // the rect's y could be  -margin.top/2, x could be based on i * (size + 100) + 100
    // i is the index in the continents array
    // use "colorScale" to fill them; colorScale is a global variable we defined, used in coloring bubbles
   

    svg.selectAll("continentName")
        .data(continents)
        .enter()
        .append("text")
        .attr("y", -margin.top/2 + size) // Align vertically with the square
        .attr("x", (d, i) => i * (size + 100) + 120)  
        .style("fill", d => colorScale(d))  // Match text color to the square
        .text(d => d) // The actual continent name
        .attr("text-anchor", "left")
        .style('font-size', '13px')
}



const svg = d3.select('#vis')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

    // Specify margin
    // [copied from lab 2]
    
    // Create svg and g
    // [copied from lab 2]

    svg.append('g')
        .attr('class', 'y-axis')
       
        .selectAll('line') 
        .style('stroke', '#ddd'); 
    