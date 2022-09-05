/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

function initialize() {
  const mapOptions = {
    zoom: 14,
    center: new google.maps.LatLng(68.64707602559126, 23.24568533956898),
    mapTypeId: 'terrain',
  };

  const map = new google.maps.Map(
    document.getElementById('map') as HTMLElement,
    mapOptions
  );

  map.addListener('click', function(e) {
    //TODO: the conext click for the delete of points no longer works when this listener is active
    var currentPath = trackPath.getPath(); // Get path from active PolyLine
    currentPath.push(new google.maps.LatLng(e.latLng)); // Add new point
    trackPath.setMap(null); // Remove the polyline from the amp
    trackPath = new google.maps.Polyline({ // Re-add the updated path
      path: currentPath,
      editable: true,
      strokeColor: '#FF0000',
      strokeOpacity: 1.0,
      strokeWeight: 2,
      map: map,
    });
  });

  const trackCoordinates = [
    new google.maps.LatLng(68.64707602559126, 23.24568533956898),
    new google.maps.LatLng(68.64815309781908, 23.234119862631882),
    new google.maps.LatLng(68.64898339551324, 23.232691904630304),
  ];

  let trackPath = new google.maps.Polyline({
    path: trackCoordinates,
    editable: true,
    strokeColor: '#FF0000',
    strokeOpacity: 1.0,
    strokeWeight: 2,
    map: map,
  });

  /**
   * A menu that lets a user delete a selected vertex of a path.
   */
  class DeleteMenu extends google.maps.OverlayView {
    private div_: HTMLDivElement;
    private divListener_?: google.maps.MapsEventListener;

    constructor() {
      super();
      this.div_ = document.createElement('div');
      this.div_.className = 'delete-menu';
      this.div_.innerHTML = 'Delete';

      const menu = this;

      google.maps.event.addDomListener(this.div_, 'click', () => {
        menu.removeVertex();
      });
    }

    onAdd() {
      const deleteMenu = this;
      const map = this.getMap() as google.maps.Map;

      this.getPanes()!.floatPane.appendChild(this.div_);

      // mousedown anywhere on the map except on the menu div will close the
      // menu.
      this.divListener_ = google.maps.event.addDomListener(
        map.getDiv(),
        'mousedown',
        (e: Event) => {
          if (e.target != deleteMenu.div_) {
            deleteMenu.close();
          }
        },
        true
      );
    }

    onRemove() {
      if (this.divListener_) {
        google.maps.event.removeListener(this.divListener_);
      }

      (this.div_.parentNode as HTMLElement).removeChild(this.div_);

      // clean up
      this.set('position', null);
      this.set('path', null);
      this.set('vertex', null);
    }

    close() {
      this.setMap(null);
    }

    draw() {
      const position = this.get('position');
      const projection = this.getProjection();

      if (!position || !projection) {
        return;
      }

      const point = projection.fromLatLngToDivPixel(position)!;

      this.div_.style.top = point.y + 'px';
      this.div_.style.left = point.x + 'px';
    }

    /**
     * Opens the menu at a vertex of a given path.
     */
    open(
      map: google.maps.Map,
      path: google.maps.MVCArray<google.maps.LatLng>,
      vertex: number
    ) {
      this.set('position', path.getAt(vertex));
      this.set('path', path);
      this.set('vertex', vertex);
      this.setMap(map);
      this.draw();
    }

    /**
     * Deletes the vertex from the path.
     */
    removeVertex() {
      const path = this.get('path');
      const vertex = this.get('vertex');

      if (!path || vertex == undefined) {
        this.close();
        return;
      }

      path.removeAt(vertex);
      this.close();
    }
  }

  const deleteMenu = new DeleteMenu();

  google.maps.event.addListener(trackPath, 'contextmenu', (e: any) => {
    // Check if click was on a vertex control point
    if (e.vertex == undefined) {
      return;
    }

    deleteMenu.open(map, trackPath.getPath(), e.vertex);
  });
}

declare global {
  interface Window {
    initialize: () => void;
  }
}
window.initialize = initialize;
export {};
