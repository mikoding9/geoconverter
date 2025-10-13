<?xml version="1.0" encoding="UTF-8"?>
<gml:FeatureCollection xmlns:gml="http://www.opengis.net/gml" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.opengis.net/gml http://schemas.opengis.net/gml/3.1.1/base/feature.xsd">
  <gml:featureMember>
    <SampleFeature>
      <name>Sample Point</name>
      <description>This is a test point in GML format</description>
      <geometry>
        <gml:Point srsName="EPSG:4326">
          <gml:pos>-6.2088 106.8456</gml:pos>
        </gml:Point>
      </geometry>
    </SampleFeature>
  </gml:featureMember>
  <gml:featureMember>
    <SampleFeature>
      <name>Sample Polygon</name>
      <description>This is a test polygon in GML format</description>
      <geometry>
        <gml:Polygon srsName="EPSG:4326">
          <gml:exterior>
            <gml:LinearRing>
              <gml:posList>
                -6.2088 106.8456
                -6.2088 106.8556
                -6.2188 106.8556
                -6.2188 106.8456
                -6.2088 106.8456
              </gml:posList>
            </gml:LinearRing>
          </gml:exterior>
        </gml:Polygon>
      </geometry>
    </SampleFeature>
  </gml:featureMember>
</gml:FeatureCollection>
