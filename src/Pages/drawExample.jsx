import { useEffect, useRef } from "react";
import {
  SciChart3DSurface,
  CameraController,
  Vector3,
  MouseWheelZoomModifier3D,
  OrbitModifier3D,
  ResetCamera3DModifier,
  NumericAxis3D,
  NumberRange,
  ScatterRenderableSeries3D,
  XyzDataSeries3D,
  SpherePointMarker3D,
  TooltipModifier3D,
  Thickness,
  EMultiLineAlignment,
  ETextAlignment,
  ETitlePosition,
  NumericLabelProvider,
} from "scichart";

const addTitleToChart = (sciChartSurface, titleText) => {
  sciChartSurface.title = titleText;
  sciChartSurface.titleStyle = {
    fontSize: 30,
    padding: Thickness.fromString("4 0 4 0"),
    useNativeText: false,
    placeWithinChart: false,
    multilineAlignment: EMultiLineAlignment.Center,
    alignment: ETextAlignment.Center,
    position: ETitlePosition.Top,
  };
};

function ThreeDChart({
  data,
  chartId,
  title,
  isMaximized,
  onMaximize,
  clearData,
  UnitOfMeasurement,
  isHistorical = false,
  ZAxis,
}) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  const drawExample = async (
    data,
    divElementId,
    UnitOfMeasurement,
    title,
    ZAxis
  ) => {
    console.log("data", data);
    const { sciChart3DSurface, wasmContext } = await SciChart3DSurface.create(
      divElementId
    );
    sciChart3DSurface.camera = new CameraController(wasmContext, {
      position: new Vector3(-101.6, 310.29, 393.32),
      target: new Vector3(0, 50, 0),
    });
    sciChart3DSurface.chartModifiers.add(
      new MouseWheelZoomModifier3D(),
      new OrbitModifier3D(),
      new ResetCamera3DModifier()
    );
    const tooltipModifier = new TooltipModifier3D({
      tooltipLegendOffsetX: 10,
      tooltipLegendOffsetY: 10,
      tooltipLegendBackground: "rgba(0, 0, 0, 0.8)",
      tooltipLegendTextColor: "white",
    });

    tooltipModifier.tooltipDataTemplate = (seriesInfo, svgAnnotation) => {
      const valuesWithLabels = [];
      if (seriesInfo && seriesInfo.isHit) {
        valuesWithLabels.push(`Phase Angle: ${seriesInfo.xValue}`);
        valuesWithLabels.push(
          `Amplitude: ${seriesInfo.yValue} ${UnitOfMeasurement}`
        );
        valuesWithLabels.push(`Cycle: ${seriesInfo.zValue}`);
      }
      return valuesWithLabels;
    };

    const defaultTemplate = tooltipModifier.tooltipSvgTemplate;
    tooltipModifier.tooltipSvgTemplate = (seriesInfo, svgAnnotation) => {
      if (seriesInfo) {
        const md = seriesInfo.pointMetadata;
        if (md) {
          svgAnnotation.containerBackground = md.color || "gray";
        }
        svgAnnotation.textStroke = "white";
      }
      return defaultTemplate(seriesInfo, svgAnnotation);
    };

    sciChart3DSurface.chartModifiers.add(tooltipModifier);
    class CustomLabelProvider extends NumericLabelProvider {
      formatLabel(value) {
        return `${Math.round(value)}`;
      }
    }

    sciChart3DSurface.xAxis = new NumericAxis3D(wasmContext, {
      axisTitle: "Phase Angle (°)",
      autoTicks: false,
      autoRange: false,
      visibleRange: new NumberRange(0, 360),
      majorDelta: 45,
      minorDelta: 15,
      labelProvider: new CustomLabelProvider(),
      labelStyle: {
        alignment: "left",
      },
    });

    sciChart3DSurface.yAxis = new NumericAxis3D(wasmContext, {
      axisTitle: `Amplitude (${UnitOfMeasurement})`,
      visibleRange: new NumberRange(0, 5000),
    });
    sciChart3DSurface.zAxis = new NumericAxis3D(wasmContext, {
      axisTitle: "Cycle",
      visibleRange: new NumberRange(0, 60),
    });

    const series = new XyzDataSeries3D(wasmContext);
    const scatterSeries = new ScatterRenderableSeries3D(wasmContext, {
      dataSeries: series,
      pointMarker: new SpherePointMarker3D(wasmContext, { size: 10 }),
      opacity: 0.9,
    });
    sciChart3DSurface.renderableSeries.add(scatterSeries);

    let cycles = {}; // Array to store the cycles

    data.forEach(([key, second, third]) => {
      if (!cycles[key]) {
        cycles[key] = {
          firstElements: [],
          secondElements: [],
          thirdElements: [],
        };
      }
      cycles[key].firstElements.push(key);
      cycles[key].secondElements.push(second);
      cycles[key].thirdElements.push(Math.abs(third));
    });

    const grouped = Object.keys(cycles).reduce((acc, key, index) => {
      acc[index + 1] = {
        firstElements: new Array(cycles[key].firstElements.length).fill(
          index > 49 ? index - 49 : index + 1
        ),
        secondElements: cycles[key].secondElements,
        thirdElements: cycles[key].thirdElements,
      };
      return acc;
    }, {});

    let dataIndex = 1;
    console.log("Object.keys(grouped).length", Object.keys(grouped).length);
    const updatePlotAndSeries = (index) => {
      const value = grouped[index + 1];
      if (index >= 50) {
        //I need to delete all the data in the series that has z value which is firstElement as datIndex
        dataIndex++;
        // Update or redraw the chart
        // sciChart3DSurface.zoomExtents();
        // console.log("series", series);
      }
      const xValues = value.secondElements;
      const yValues = value.thirdElements;
      const zValues = value.firstElements;
      series.appendRange(xValues, yValues, zValues);
    };
    for (let i = 0; i < Object.keys(grouped).length; i++) {
      // console.log("index value---", i);
      updatePlotAndSeries(i);
    }

    addTitleToChart(sciChart3DSurface, title);
    return { sciChartSurface: sciChart3DSurface, wasmContext };
  };

  const initializeChart = async () => {
    if (chartRef.current && !chartInstance.current) {
      chartInstance.current = await drawExample(
        data,
        chartRef.current.id,
        UnitOfMeasurement,
        title,
        ZAxis
      );
    }
  };

  useEffect(() => {
    initializeChart();
    return () => {
      if (chartInstance.current) {
        chartInstance.current.sciChartSurface.delete();
        chartInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (chartInstance.current && data) {
      if (!isHistorical) {
        updateChartData(
          data,
          chartInstance.current.sciChartSurface,
          chartInstance.current.wasmContext
        );
      } else {
        chartInstance.current.sciChartSurface.delete();
        chartInstance.current = null;
        initializeChart();
      }
    }
  }, [data, UnitOfMeasurement, ZAxis, title, isHistorical]);

  const updateChartData = (data, sciChart3DSurface, wasmContext) => {
    // sciChart3DSurface.renderableSeries.clear(true);
    // const series = new XyzDataSeries3D(wasmContext);
    // const scatterSeries = new ScatterRenderableSeries3D(wasmContext, {
    //   dataSeries: series,
    //   pointMarker: new SpherePointMarker3D(wasmContext, { size: 10 }),
    //   opacity: 0.9,
    // });
    // sciChart3DSurface.renderableSeries.add(scatterSeries);
    // let cycles = {}; // Array to store the cycles
    // data.forEach(([key, second, third]) => {
    //   if (!cycles[key]) {
    //     cycles[key] = { firstElements: [], secondElements: [], thirdElements: [] };
    //   }
    //   cycles[key].firstElements.push(key);
    //   cycles[key].secondElements.push(second);
    //   cycles[key].thirdElements.push(Math.abs(third));
    // });
    // const grouped = Object.keys(cycles).reduce((acc, key, index) => {
    //   acc[index + 1] = {
    //     firstElements: new Array(cycles[key].firstElements.length).fill(index > 49 ? index - 49 : index + 1),
    //     secondElements: cycles[key].secondElements,
    //     thirdElements: cycles[key].thirdElements
    //   };
    //   return acc;
    // }, {});
    // let dataIndex = 1;
    // const updatePlotAndSeries = (index) => {
    //   const value = grouped[index + 1];
    //   // console.log('value',value);
    //   const firstElement = value.firstElements[0];
    //   if (firstElement > 50) {
    //     console.log('dataIndex',dataIndex);
    //     series.forEach((point, index) => {
    //       if (point.z === dataIndex) {
    //         series.removeAt(index);
    //       }
    //     });
    //     dataIndex++;
    //     // Update or redraw the chart
    //     sciChart3DSurface.zoomExtents();
    //   }
    //   const xValues = value.secondElements;
    //   const yValues = value.thirdElements;
    //   const zValues = value.firstElements;
    //   series.appendRange(xValues, yValues, zValues);
    // };
    // for (let i = 0;  i < Object.keys(grouped).length; i++) {
    //   updatePlotAndSeries(i);
    // }
  };

  const chartContainerStyle = {
    width: "100%",
    height: isMaximized
      ? `calc(100vh - ${isHistorical ? 400 : 200}px)`
      : "400px",
    maxHeight: "100%",
  };

  return (
    <div>
      {/* <Box> */}
      {/* // <Box className="d-flex gap-2 w-100">
        //   <Typography className="text-center" variant="h5" style={{ flex: 1 }}>
        //     {title}
        //   </Typography>
        //   <Tooltip title={isMaximized ? "Minimize" : "Maximize"}>
        //     <IconButton
        //       onClick={() => onMaximize(chartId)}
        //       style={{ background: "#000", height: 30, width: 30 }}
        //     >
        //       {isMaximized ? (
        //         <MinimizeIcon sx={{ color: "#FFF" }} />
        //       ) : (
        //         <CropSquareIcon sx={{ color: "#FFF" }} />
        //       )}
        //     </IconButton>
        //   </Tooltip>
        // </Box>
          </Box> */}
      <div id={chartId} ref={chartRef} />
    </div>
  );
}
// ThreeDChart.propTypes = {
//   data: PropTypes.array,
//   chartId: PropTypes.string.isRequired,
//   title: PropTypes.string,
//   isMaximized: PropTypes.bool.isRequired,
//   onMaximize: PropTypes.func.isRequired,
//   clearData: PropTypes.bool,
//   ScalingFactor: PropTypes.number.isRequired,
//   UnitOfMeasurement: PropTypes.number.isRequired,
//   gradientStops: PropTypes.array,
//   ZAxis: PropTypes.number,
//   isHistorical: PropTypes.bool,
// };

export default ThreeDChart;
