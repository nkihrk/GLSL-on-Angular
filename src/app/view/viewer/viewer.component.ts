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

	private isEnabledMove = false;

	constructor(private three: ThreeService) {}

	ngOnInit(): void {
		this.three.init(this.wrapperRef.nativeElement, this.targetRef.nativeElement);
	}

	onPointerEvent($e: { x: number; y: number; state: string }): void {
		if ($e.state === 'down') {
			this.isEnabledMove = true;
		} else if ($e.state === 'up') {
			this.isEnabledMove = false;
			this.three.onMove(0, 0);
		} else if ($e.state === 'move' && this.isEnabledMove) {
			this.three.onMove($e.x, $e.y);
		}
	}
}
