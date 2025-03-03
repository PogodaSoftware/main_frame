import { Component } from '@angular/core';

@Component({
  selector: 'app-blenderfiles',
  imports: [],
  template: `
    <body>
      <script></script>
      <script>
        let scene;
        function init() {
          scene = new THREE.Scene();
          scene.background = new THREE.Color(0xdddddd);
        camera
        }
      </script>
    </body>
  `,
  styleUrl: './blenderfiles.component.scss',
})
export class BlenderfilesComponent {}
