/*
	StateView
	==========
	A statewide view of a selected metric, with a heatmap and a set of histograms
*/
import {parseData, METRICS, METRIC_TYPE, STYLES, SCALE, DOMAIN} from './distopiaInterface.js'
import Histogram from "./viz/histogram.js";

var SELF;

export class StateView {
	
	constructor(initData, metricFocus = "population", counties){
		this.counties = counties;
		this.metricFocus = metricFocus;
		console.log("Initiating State View");
		this.stateDiv = d3.select("#state");
	
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
		this.drawStatePolygons();

		let max = 1;
		if(this.metricFocus == "population"){ max = 3000000; }

		this.histograms = [];
		if(initData != null){
			const focusedData = this.filterByFocusMetric(initData);
			for(var i = 0; i < 8; i++){
				d3.select("#" + "dist" + (i+1)).append("text").attr("x", 10).attr("y", 10).text(i);
				this.histograms.push(new Histogram("#" + "dist" + (i+1), focusedData[i].data, focusedData[i].labels, styles[this.metricFocus],max));
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
				data: null,
				scalar_value: null,
				scalar_maximum: null
			}
			district.metrics.forEach(m => {
				if(m.name == this.metricFocus){
					d.name = m.name;
					d.labels = m.labels;
					d.data = m.data;
					d.scalar_value = m.scalar_value;
					d.scalar_maximum = m.scalar_maximum;
				}
			});
			districtData.push(d);
		});
		return districtData;
	}
	
	setMetricFocus(metric){
		this.metricFocus = metric;
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

	paintStateViz(){
		let state = this.stateDiv.selectAll("polygon").data(this.counties);
		state.attr("fill", function(county){
			return county.fill;
		});
	}

	paintHistograms(data){
		let max = 1;
		if(this.metricFocus == "population"){ max = 3000000; }
		for(var i = 0; i < this.histograms.length; i++){
			this.histograms[i].update(data[i].data, data[i].labels, STYLES[this.metricFocus], max);
		}
	}

	update(data,metric){
		d3.selectAll(".dist_label").remove();
		d3.selectAll(".label").remove();
		d3.selectAll(".key").remove();
		//update the viz. Note that the
		if(metric != undefined){
			if(metric != this.metric){
				this.setMetricFocus(metric);
			}
		}
		if(data.length < 8){ return; }
		
		//pull the metric wanted for each district
		let max = 1;
		if(this.metricFocus == "population"){ max = 3000000; }
		const districtData = this.filterByFocusMetric(data);
		if(this.histograms.length == 0){
			for(var i = 0; i < 8; i++){
				d3.select("#" + "dist" + (i+1)).append("text").attr("x", 10).attr("y", 15).text(i);
				this.histograms.push(new Histogram("#" + "dist" + (i+1), districtData[i].data, districtData[i].labels, STYLES[this.metricFocus], max));
			}
		}
		if(!this.drawn){ this.drawStatePolygons(); }

		let labelText = "";
		if(this.metricFocus == "age"){ labelText = "Median Age per District"; }
		else if(this.metricFocus == "education"){ labelText = "% of Population with a Bachelor's Degree per District"; }
		else if(this.metricFocus == "income"){ labelText = "Median Income per District"; }
		else if(this.metricFocus == "occupation"){ labelText = "% Employed per District"; }
		else if(this.metricFocus == "population"){ labelText = "Population per District"; }
		else if(this.metricFocus == "projected_votes"){ labelText = "Partisan Lean per District"; }
		else if(this.metricFocus == "race"){ labelText = "% Minority population per District"; }

		d3.select("#label_area").append("text").text(labelText).attr("class", "label")
			.attr("x", parseFloat(d3.select("#label_area").style("width"))/2)
			.attr("y", parseFloat(d3.select("#label_area").style("height"))/2)
			.style("text-anchor", "middle").style("alignment-baseline", "middle")
			.style("font-size", "2em");

		districtData.forEach((district, i) => {
			let distX_min = 1000000, distX_max = 0, distY_min = 1000000, distY_max = 0;
			let scale = SCALE[this.metricFocus];
			let f = scale([district.scalar_value, district.scalar_maximum]);
			district.precincts.forEach((precinct) => {
				this.counties[precinct].fill = f;
				if(distX_min > this.counties[precinct].x[0]){ distX_min = this.counties[precinct].x[0]; }
				if(distX_max < this.counties[precinct].x[1]){ distX_max = this.counties[precinct].x[1]; }
				if(distY_min > this.counties[precinct].y[0]){ distY_min = this.counties[precinct].y[0]; }
				if(distY_max < this.counties[precinct].y[1]){ distY_max = this.counties[precinct].y[1]; }
			});
			this.stateDiv.append("text").attr("class", "dist_label")
				.attr("x", this.xScale(distX_min + (distX_max-distX_min)/2))
				.attr("y", this.yScale(distY_min + (distY_max-distY_min)/2))
				.text(i);
		});

		let key = d3.select("#scale").append("g").attr("class", "key");
		
		let key_height = parseFloat(d3.select("#scale").style("height"));
		let key_width = parseFloat(d3.select("#scale").style("width"));

		let scale = SCALE[this.metricFocus];
		let domain = DOMAIN[this.metricFocus].domain;
		let step = (domain[domain.length-1] - domain[0])/5;
		for(var i = 0; i <= 5; i++){
			key.append("rect").attr("height", key_height - 40).attr("width", key_height - 40)
				.attr("x", i * key_height).attr("y", 20).attr("fill", scale([domain[0] + i * step, domain[domain.length-1]]));
		}
		key.append("text").attr("x", 0).attr("y", key_height - 8).text(domain[0] + " " + DOMAIN[this.metricFocus].label);
		key.append("text").attr("x", 5 * (key_height)).attr("y", key_height - 8).text(domain[domain.length-1] + " " + DOMAIN[this.metricFocus].label);

		key.attr("transform", "translate(120,0)")

		this.paintStateViz();
		this.paintHistograms(districtData);	
	}

	drawStatePolygons(){
		if(this.xScale != null){
			this.stateDiv.selectAll("polygon").data(this.counties).enter().append("polygon")
				.attr("points", function(county){
					return county.boundaries.map(function(point){
						return [SELF.xScale(point[0]), SELF.yScale(point[1])].join(",");
					}).join(" ");
				})
				.attr("fill", function(county){
					return county.fill;
				});
			this.drawn = true;
		}
		else{ return; }
	}
}