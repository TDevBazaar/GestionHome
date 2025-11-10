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

export interface ChartData {
  category: string;
  total: number;
}

@Component({
  selector: 'app-category-chart',
  template: `<figure #chartContainer class="w-full h-80 relative"></figure>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:resize)': 'onResize()'
  }
})
export class CategoryChartComponent implements OnChanges, AfterViewInit {
  data = input.required<ChartData[]>();
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
    if (!data || data.length === 0 || element.clientWidth === 0) return;
    
    const margin = { top: 20, right: 30, bottom: 70, left: 70 };
    const width = element.clientWidth - margin.left - margin.right;
    const height = 320 - margin.top - margin.bottom; // 320px is h-80

    const svg = d3.select(element)
      .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
      .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Tooltip
    const tooltip = d3.select(element)
      .append("div")
      .style("opacity", 0)
      .attr("class", "absolute bg-slate-900 text-white text-xs rounded-md px-2 py-1 pointer-events-none transition-opacity duration-200")
      .style("transform", "translateX(-50%)");

    // X axis
    const x = d3.scaleBand()
      .range([0, width])
      .domain(data.map(d => d.category))
      .padding(0.3);

    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
        .attr('transform', 'translate(-10,0)rotate(-45)')
        .style('text-anchor', 'end')
        .style('fill', 'currentColor')
        .style('font-size', '12px');

    // Y axis
    const yMax = d3.max(data, d => d.total) ?? 0;
    const y = d3.scaleLinear()
      .domain([0, yMax * 1.1]) // Add 10% padding to top
      .range([height, 0]);

    const compactCurrencyFormat = new Intl.NumberFormat('es-ES', { style: 'currency', currency: this.currency(), notation: 'compact', compactDisplay: 'short', maximumFractionDigits: 1 });
    const fullCurrencyFormat = new Intl.NumberFormat('es-ES', { style: 'currency', currency: this.currency(), currencyDisplay: 'symbol' });
    
    svg.append('g')
      .call(d3.axisLeft(y).ticks(5).tickFormat(d => compactCurrencyFormat.format(d as number)))
      .selectAll('text')
        .style('fill', 'currentColor')
        .style('font-size', '12px');

    // Bars
    svg.selectAll('mybar')
      .data(data)
      .join('rect')
        .attr('x', (d: ChartData) => x(d.category)!)
        .attr('width', x.bandwidth())
        .attr('fill', '#0ea5e9') // sky-500
        .attr('rx', 3) // Rounded corners
        // Animation
        .attr('height', d => height - y(0))
        .attr('y', d => y(0))
      .on('mouseover', function(event, d) {
          d3.select(this).attr('fill', '#0284c7'); // sky-600
          tooltip.style("opacity", 1);
      })
      .on('mousemove', function(event, d) {
          const formattedTotal = fullCurrencyFormat.format(d.total);
          tooltip
              .html(`<strong>${d.category}</strong><br>${formattedTotal}`)
              .style("left", (d3.pointer(event)[0] + margin.left) + "px")
              .style("top", (d3.pointer(event)[1] - 10) + "px");
      })
      .on('mouseleave', function(event, d) {
          d3.select(this).attr('fill', '#0ea5e9'); // sky-500
          tooltip.style("opacity", 0);
      });
      
    // Bar animation
    svg.selectAll("rect")
      .transition()
      .duration(800)
      .attr("y", (d: any) => y(d.total))
      .attr("height", (d: any) => height - y(d.total))
      .delay((d,i) => i * 100);
  }
}