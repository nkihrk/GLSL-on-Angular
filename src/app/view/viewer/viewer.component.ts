import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ThreeService } from '../../service/three.service';

@Component({
	selector: 'app-viewer',
	templateUrl: './viewer.component.html',
	styleUrls: ['./viewer.component.scss']
})
export class ViewerComponent implements OnInit {
	@ViewChild('wrapper', { static: true }) wrapperRef: ElementRef<HTMLDivElement>;
	@ViewChild('target', { static: true }) targetRef: ElementRef<HTMLCanvasElement>;

	constructor(private three: ThreeService) {}

	ngOnInit(): void {
		this.three.init(this.wrapperRef.nativeElement, this.targetRef.nativeElement);
	}
}
