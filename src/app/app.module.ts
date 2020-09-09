import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ViewerComponent } from './view/viewer/viewer.component';
import { PointerDirective } from './directive/pointer.directive';

@NgModule({
	declarations: [AppComponent, ViewerComponent, PointerDirective],
	imports: [BrowserModule, AppRoutingModule, HttpClientModule],
	providers: [],
	bootstrap: [AppComponent]
})
export class AppModule {}
