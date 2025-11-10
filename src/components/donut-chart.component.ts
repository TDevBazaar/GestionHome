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

export interface DonutChartData {
  name: string;
  value: number;
}

@Component({
  selector: 'app-donut-chart',
  template: `<figure #chartContainer class="w-full h-80 relative"></figure>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:resize)': 'onResize()'
  }
})
export class DonutChartComponent implements OnChanges, AfterViewInit {
  data = input.required<DonutChartData[]>();
  currency = input<string>('USD');

  private chartContainer = viewChild.required<ElementRef<HTMLElement>>('chartContainer');
  private isViewInitialized = false;
  private readonly colors = ["#0ea5e9", "#6366f1", "#10b981", "#f97316", "#eab308", "#d946ef", "#f43f5e", "#64748b"];

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
    if (!data || data.length === 0 || element.clientWidth === 0) return;
    
    const width = element.clientWidth;
    const height = 320; // h-80
    const margin = 40;
    const radius = Math.min(width, height) / 2 - margin;

    const svg = d3.select(element)
      .append("svg")
        .attr("width", width)
        .attr("height", height)
      .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);
        
    const tooltip = d3.select(element)
      .append("div")
      .style("opacity", 0)
      .attr("class", "absolute bg-slate-900 text-white text-xs rounded-md px-2 py-1 pointer-events-none transition-opacity duration-200");
        
    const color = d3.scaleOrdinal()
      .domain(data.map(d => d.name))
      .range(this.colors);

    const pie = d3.pie<DonutChartData>()
      .sort(null)
      .value(d => d.value);

    const data_ready = pie(data);
    const totalSum = d3.sum(data, d => d.value);
    
    const arc = d3.arc()
      .innerRadius(radius * 0.5)
      .outerRadius(radius * 0.8);
      
    const outerArc = d3.arc()
      .innerRadius(radius * 0.9)
      .outerRadius(radius * 0.9);

    const compactCurrencyFormat = new Intl.NumberFormat('es-ES', { style: 'currency', currency: this.currency(), notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 });
    const fullCurrencyFormat = new Intl.NumberFormat('es-ES', { style: 'currency', currency: this.currency(), currencyDisplay: 'symbol' });

    // Build the chart
    svg.selectAll('allSlices')
      .data(data_ready)
      .join('path')
      .attr('d', arc as any)
      .attr('fill', d => color(d.data.name) as string)
      .attr("stroke", "white")
      .style("stroke-width", "2px")
      .style("opacity", 0.7)
      .on('mouseover', function(event, d) {
        d3.select(this).style("opacity", 1);
        tooltip.style("opacity", 1);
      })
      .on('mousemove', (event, d) => {
        const percentage = (d.data.value / totalSum * 100).toFixed(1);
        tooltip
          .html(`<strong>${d.data.name}</strong><br>${fullCurrencyFormat.format(d.data.value)} (${percentage}%)`)
          .style("left", (d3.pointer(event)[0] + width / 2) + "px")
          .style("top", (d3.pointer(event)[1] + height / 2 - 20) + "px");
      })
      .on('mouseleave', function(event, d) {
        d3.select(this).style("opacity", 0.7);
        tooltip.style("opacity", 0);
      })
      // Animation
      .transition()
      .duration(1000)
      .attrTween('d', function(d) {
          const i = d3.interpolate(d.startAngle+0.1, d.endAngle);
          return function(t) {
              d.endAngle = i(t);
              return arc(d as any) as string;
          }
      });
      
    // Center text
    svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.5em')
        .style('font-size', '1rem')
        .style('font-weight', 'bold')
        .style('fill', 'currentColor')
        .text('Total Gastado');
        
    svg.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.0em')
        .style('font-size', '1.25rem')
        .style('font-weight', 'bold')
        .style('fill', 'currentColor')
        .text(compactCurrencyFormat.format(totalSum));
  }
}