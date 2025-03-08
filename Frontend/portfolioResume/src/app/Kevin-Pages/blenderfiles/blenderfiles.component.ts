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
  private routeSub?: Subscription;

  constructor(
    private kevinGlobalService: KevinGlobalService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.routeSub = this.route.queryParams.subscribe((params) => {
      const model = params['model'] || 'snowman';

      const helpers = params['helpers'] === 'true';

      const color = params['color'] || 'black';

      const cameraX = Number(params['cameraX']) || 0;
      const cameraY = Number(params['cameraY']) || 0;
      const cameraZ = Number(params['cameraZ']) || 0;
      const hdrPath = params['hdrPath'] || '';

      this.kevinGlobalService.threeDimensionModelBuilder(
        'canvas',
        model,
        helpers,
        color,
        cameraX,
        cameraY,
        cameraZ,
        1,
        1,
        hdrPath
      );
    });
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }
}
