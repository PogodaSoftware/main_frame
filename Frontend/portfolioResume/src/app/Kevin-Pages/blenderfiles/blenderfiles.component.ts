import { Component, OnInit, OnDestroy } from '@angular/core';
import { KevinGlobalService } from '../global/global.service';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-blenderfiles',
  template: `
    <body>
      <canvas id="canvas"></canvas>
    </body>
  `,
  styleUrls: ['./blenderfiles.component.scss'],
})
export class KevinBlenderFilesComponent implements OnInit, OnDestroy {
  private routeSub: Subscription = new Subscription();

  constructor(
    private kevinGlobalService: KevinGlobalService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.routeSub = this.route.queryParams.subscribe((params) => {
      const model = params['model'] || 'snowman';
      this.kevinGlobalService.threeDimensionModelBuilder(
        'canvas',
        model,
        false,
        'black',
        0,
        1,
        4,
        1,
        1
      );
    });
  }

  ngOnDestroy(): void {
    this.routeSub.unsubscribe();
  }
}
