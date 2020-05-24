map = "../data/countries-50m.json";
edg = "../data/exports_edgelist.csv";
nod = "../data/export-nodelist_with_metadata.csv";

Promise.all([d3.json(map), d3.csv(edg), d3.csv(nod)]).then((values) => drawMap(values));

function drawMap(values) {
  const mapa_mundi = values[0],
    edgelist = values[1],
    nodelist = values[2];

  vl.register(vega, vegaLite, {});

  // interactive selection for origin node
  // select nearest node to mouse cursor
  const origin = vl
    .selectSingle()
    .on('mouseover')
    .nearest(true)
    .fields('Source')
    .empty('none');

  // base map of the world
  const map = vl
    .markGeoshape({ fill: '#ddd', stroke: '#fff', strokeWidth: 1 })
    .data(vl.topojson(mapa_mundi).feature('countries'));

  // shared data reference for lookup transforms
  const target = vl
    .data(nodelist)
    .key('Node')
    .fields('Latitude (average)', 'Longitude (average)');

  // add route lines from selected origin node to target nodes
  const routes = vl
    .markRule({ color: '#000', opacity: 0.5 })
    .data(edgelist)
    .transform(
      vl.filter(origin), // filter to selected origin only
      vl.lookup('Source').from(target), // origin lat/lon
      vl
        .lookup('Target')
        .from(target)
        .as('lat2', 'lon2') // target lat/lon
    )
    .encode(
      vl
        .strokeWidth()
        .fieldQ('Weight')
        .legend(null),
      vl.latitude().fieldQ('Latitude (average)'),
      vl.longitude().fieldQ('Longitude (average)'),
      vl.latitude2().field('lat2'),
      vl.longitude2().field('lon2')
    );

  // size node by in-degree
  // 1. aggregate edgelist dataset
  // 2. lookup location data from nodelist
  const points = vl
    .markCircle({ opacity: 0.45 })
    .data(edgelist)
    .transform(
      vl.groupby('Source').aggregate(vl.count().as('routes')),
      vl
        .lookup('Source')
        .from(
          target.fields(
            'Node',
            'in-degree',
            'continent',
            'Latitude (average)',
            'Longitude (average)'
          )
        )
    )
    .select(origin)
    .encode(
      vl.latitude().fieldQ('Latitude (average)'),
      vl.longitude().fieldQ('Longitude (average)'),
      vl
        .size()
        .fieldQ('in-degree')
        .scale({ range: [10, 1000] })
        .legend(null),
      vl
        .color()
        .fieldN('continent')
        .legend(null),
      vl.tooltip(["Node", "in-degree"]),
      vl
        .order()
        .fieldQ('routes')
        .sort('descending') // place smaller nodes on top
    );

  return vl
    .layer(map, routes, points)
    .project(vl.projection('naturalEarth1'))
    .width(1200)
    .height(700)
    .config({ view: { stroke: null } })
    .render()
    .then(chart => {
      document
        .getElementById("chart")
        .appendChild(chart);
    });
}