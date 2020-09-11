import { Directive, HostListener, Output, EventEmitter } from '@angular/core';

@Directive({
	selector: '[appPointer]'
})
export class PointerDirective {
	@Output() pointerData = new EventEmitter<{ x: number; y: number; state: string }>();

	private downFlg = false;
	private moveFlg = false;

	constructor() {}

	_emitData($clientX: number, $clientY: number, $state: string): void {
		this.pointerData.emit({
			x: $clientX,
			y: $clientY,
			state: $state
		});
	}

	_resetAllFlgs(): void {
		this.downFlg = false;
		this.moveFlg = false;
	}

	// Pointerdown listener
	@HostListener('pointerdown', ['$event']) onPointerDown($e): void {
		this._onDown($e);
	}

	// Pointerup listener
	@HostListener('document:pointerup', ['$event']) onPointerUp($e): void {
		this._onUp($e);
	}

	// Pointermove listener
	@HostListener('document:pointermove', ['$event']) onPointerMove($e): void {
		this._onMove($e);
	}

	// Down event
	_onDown($e: any): void {
		this._emitData($e.clientX, $e.clientY, 'down');
	}

	// Up event
	_onUp($e: any): void {
		this._emitData($e.clientX, $e.clientY, 'up');
	}

	// Move event
	_onMove($e: any): void {
		this._emitData($e.clientX, $e.clientY, 'move');
	}
}
