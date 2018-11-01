/*
	StateView
	==========
	A statewide view of a selected metric, with a heatmap and a set of histograms
*/
import {parseData, METRICS, METRIC_TYPE, STYLES, SCALE} from './distopiaInterface.js'
import Histogram from "./viz/histogram.js";

var SELF;

export class StateView {
	
	constructor(initData, metricFocus = "population", counties){
		this.counties = counties;
		this.metricFocus = metricFocus;
		console.log("Initiating State View");
		this.stateDiv = d3.select("#state").selectAll("polygon");
	
		this.width = parseFloat(d3.select("#state").style("width"));
		this.height = parseFloat(d3.select("#state").style("height"));
		SELF = this;

		this.xScale = null;
		this.yScale = null;

		this.MIN_X = null;
		this.MIN_Y = null;
		this.MAX_X = null;
		this.MAX_Y = null;

		this.drawn = false;

		this.histograms = [];
		if(initData != null){
			this.drawStatePolygons();
			const focusedData = this.filterByFocusMetric(initData);
			for(var i = 0; i < 8; i++){
				this.histograms.push(new Histogram("#" + "dist" + (i+1), focusedData[i].data, focusedData[i].labels, styles[this.metricFocus]));
			}
		}
	}

	filterByFocusMetric(data){
		let districtData = []
		data.forEach(district => {
			let d = {
				precincts: district.precincts,
				name: null,
				labels: null,
				data: null
			}
			district.metrics.forEach(m => {
				if(m.name == this.metricFocus){
					d.name = m.name;
					d.labels = m.labels;
					d.data = m.data;
				}
			});
			districtData.push(d);
		});
		return districtData;
	}
	
	setMetricFocus(metric){
		this.metricFocus = metric;
		//this.paintHistograms();
	}

	getMetricFocus(){
		return this.metricFocus;
	}

	setBounds(MIN_X, MIN_Y, MAX_X, MAX_Y){
		this.MIN_X = MIN_X;
		this.MIN_Y = MIN_Y;
		this.MAX_X = MAX_X;
		this.MAX_Y = MAX_Y;

		this.xScale = d3.scaleLinear().domain([MIN_X, MAX_X]).range([20, this.width - 20]);
		this.yScale = d3.scaleLinear().domain([MIN_Y, MAX_Y]).range([this.height - 20, 20]);
	}

	paintStateViz(countyData){
		this.stateDiv.data(countyData).style("fill", function(county){
			console.log(county.fill);
			return county.fill;
		});
	}

	paintHistograms(data){
		for(var i = 0; i < this.histograms.length; i++){
			this.histograms[i].update(data[i].data, data[i].labels, STYLES[this.metricFocus]);
		}
	}

	update(data,metric){
		console.log("updating");
		//update the viz. Note that the
		if(metric != undefined){
			this.setMetricFocus(metric);
		}
		console.log(data);
		if(data.length < 8){
			return;
		}
		
		//pull the metric wanted for each district
		let filledCounties = [];
		const districtData = this.filterByFocusMetric(data);
		console.log(districtData);
		if(this.histograms.length == 0){
			for(var i = 0; i < 8; i++){
				this.histograms.push(new Histogram("#" + "dist" + (i+1), districtData[i].data, districtData[i].labels, STYLES[this.metricFocus]));
			}
		}
		if(!this.drawn){ this.drawStatePolygons(); }

		districtData.forEach((district) => {
			let scale = SCALE[this.metricFocus];
			let f = scale(district.data);
			district.precincts.forEach((precinct) => {
				filledCounties.push({...this.counties[precinct], fill: f});
			});
		});

		this.paintStateViz(filledCounties);
		this.paintHistograms(districtData);	
	}

	drawStatePolygons(){
		if(this.xScale != null){
			console.log("drawing poly");
			//TODO: change how referencing counties
			this.stateDiv.data(this.counties).enter().append("polygon")
				.attr("points", function(county){
					return county.boundaries.map(function(point){
						let x = SELF.xScale; let y = SELF.yScale;
						return [x(point[0]), y(point[1])].join(",");
					}).join(" ");
				})
				.style("fill", function(county){
					console.log(county.fill);
					if(county.fill == undefined) return "white";
					else return county.fill;
				});
			this.drawn = true;
		}
		else{
			return;
		}
	}
}