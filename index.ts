/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

function initialize() {
  google.load("visualization", "1", { packages: ["columnchart"] });

  const mapOptions = {
    zoom: 14,
    center: new google.maps.LatLng(68.64707602559126, 23.24568533956898),
    mapTypeId: 'terrain',
  };

  const map = new google.maps.Map(
    document.getElementById('map') as HTMLElement,
    mapOptions
  );

  map.addListener('mousedown', function(e) {
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
    updateProfile(trackPath.getPath().getArray(), elevator, map, 'Profile', 'profile-div');   
    google.maps.event.addListener(trackPath, 'contextmenu', (e: any) => {
      // Check if click was on a vertex control point
      if (e.vertex == undefined) {
        console.log("not on control point");
        return;
      }
  
      deleteMenu.open(map, trackPath.getPath(), e.vertex);
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

  const elevator = new google.maps.ElevationService();

  function updateProfile(
    path: google.maps.LatLng[],
    elevator: google.maps.ElevationService,
    map: google.maps.Map,
    title: string,
    elementName: string
  ) {
    // Create a PathElevationRequest object using this array.
    // Ask for 256 samples along that path.
    // Initiate the path request.
    elevator
      .getElevationAlongPath({
        path: path,
        samples: 75,
      })
      .then(data => plotElevation(data, title, elementName))
      .catch((e) => {
        const chartDiv = document.getElementById(
          "profile-div"
        ) as HTMLElement;
  
        // Show the error code inside the chartDiv.
        chartDiv.innerHTML = "Cannot show elevation: request failed because " + e;
      });
  }
  
  function plotElevation({ results }: google.maps.PathElevationResponse, title: string, elementName: string) {
    const chartDiv = document.getElementById(elementName) as HTMLElement;
  
    // Create a new chart in the elevation_chart DIV.
    const chart = new google.visualization.ColumnChart(chartDiv);
  
    // Extract the data from which to populate the chart.
    // Because the samples are equidistant, the 'Sample'
    // column here does double duty as distance along the
    // X axis.
    const data = new google.visualization.DataTable();
  
    data.addColumn("string", "Sample");
    data.addColumn("number", "Elevation");
  
    for (let i = 0; i < results.length; i++) {
      data.addRow(["", results[i].elevation]);
    }
  
    // Draw the chart using the data within its DIV.
    chart.draw(data, {
      backgroundColor: "lightgrey",
      height: 150,
      legend: "none",
      title: title,
    });
  }
  

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
      google.maps.event.addDomListener(this.div_, 'click', (e) => {
        menu.removeVertex();
      });
    }

    onAdd() {
      const deleteMenu = this;
      const map = this.getMap() as google.maps.Map;

      this.getPanes()!.floatPane.appendChild(this.div_);

      // mousedown anywhere on the map except on the menu div will close the menu.
      this.divListener_ = google.maps.event.addDomListener(
        map.getDiv(),
        'mousedown',
        (e: Event) => {
          if (e.target != deleteMenu.div_) {
            deleteMenu.close();
          }
          e.stopPropagation(); // Avoid adding a new point to the track for this 'delete'-click
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
      console.log("not on control point");
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
