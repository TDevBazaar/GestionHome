import {
  Component,
  ChangeDetectionStrategy,
  input,
  ElementRef,
  viewChild,
  OnChanges,
  AfterViewInit,
} from '@angular/core';
import * as d3 from 'd3';

export interface LineChartData {
  date: Date;
  value: number;
}

@Component({
  selector: 'app-line-chart',
  template: `<figure #chartContainer class="w-full h-80 relative"></figure>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:resize)': 'onResize()'
  }
})
export class LineChartComponent implements OnChanges, AfterViewInit {
  data = input.required<LineChartData[]>();
  currency = input<string>('USD');

  private chartContainer = viewChild.required<ElementRef<HTMLElement>>('chartContainer');
  private isViewInitialized = false;

  ngAfterViewInit(): void {
    this.isViewInitialized = true;
    this.createChart();
  }
  
  ngOnChanges(): void {
    if (this.isViewInitialized) {
      this.createChart();
    }
  }

  onResize(): void {
    this.createChart();
  }

  private createChart(): void {
    const element = this.chartContainer().nativeElement;
    d3.select(element).select('svg').remove();
    d3.select(element).select('div').remove(); // Remove old tooltip

    const data = this.data();
    if (!data || data.length < 2 || element.clientWidth === 0) return;
    
    const margin = { top: 20, right: 40, bottom: 50, left: 80 };
    const width = element.clientWidth - margin.left - margin.right;
    const height = 320 - margin.top - margin.bottom;

    const svg = d3.select(element)
      .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
      .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
        
    const tooltip = d3.select(element)
      .append("div")
      .style("opacity", 0)
      .attr("class", "absolute bg-slate-900 text-white text-xs rounded-md px-2 py-1 pointer-events-none transition-opacity duration-200");

    // X axis
    const x = d3.scaleTime()
      .domain(d3.extent(data, d => d.date) as [Date, Date])
      .range([ 0, width ]);
    svg.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(x).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat("%b %y")))
      .selectAll('text')
        .style('fill', 'currentColor');

    // Y axis
    const yMax = d3.max(data, d => d.value) ?? 0;
    const y = d3.scaleLinear()
      .domain([0, yMax * 1.1])
      .range([ height, 0 ]);

    const compactCurrencyFormat = new Intl.NumberFormat('es-ES', { style: 'currency', currency: this.currency(), notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 });
    const fullCurrencyFormat = new Intl.NumberFormat('es-ES', { style: 'currency', currency: this.currency(), currencyDisplay: 'symbol' });
    
    svg.append("g")
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => compactCurrencyFormat.format(d as number)))
      .selectAll('text')
        .style('fill', 'currentColor');

    // Line
    const line = d3.line<LineChartData>()
      .x(d => x(d.date))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    const path = svg.append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#0ea5e9") // sky-500
      .attr("stroke-width", 2.5)
      .attr("d", line);
      
    // Animate line
    const pathLength = path.node()!.getTotalLength();
    path.attr("stroke-dasharray", pathLength + " " + pathLength)
        .attr("stroke-dashoffset", pathLength)
        .transition()
        .ease(d3.easeSin)
        .duration(1500)
        .attr("stroke-dashoffset", 0);

    // Circles for data points
    svg.selectAll("myCircles")
      .data(data)
      .enter()
      .append("circle")
        .attr("fill", "#0284c7") // sky-600
        .attr("stroke", "none")
        .attr("cx", d => x(d.date))
        .attr("cy", d => y(d.value))
        .attr("r", 4)
        .style("opacity", 0)
        .on('mouseover', function(event, d) {
            d3.select(this).transition().duration(200).attr("r", 6);
            tooltip.style("opacity", 1);
        })
        .on('mousemove', (event, d) => {
            const formattedValue = fullCurrencyFormat.format(d.value);
            const formattedDate = d3.timeFormat("%B %Y")(d.date);
            tooltip
                .html(`<strong>${formattedDate}</strong><br>${formattedValue}`)
                .style("left", (d3.pointer(event)[0] + margin.left) + "px")
                .style("top", (d3.pointer(event)[1] - 10) + "px");
        })
        .on('mouseleave', function(event, d) {
            d3.select(this).transition().duration(200).attr("r", 4);
            tooltip.style("opacity", 0);
        })
      .transition()
      .delay((d,i) => i * (1500 / data.length))
      .duration(200)
      .style("opacity", 1);
  }
}