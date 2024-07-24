import PropTypes from "prop-types";
import Grid from "@mui/material/Grid";
import { useEffect, useState } from "react";
import { isEmpty } from "lodash";
import { CircularProgress } from "@mui/material";
import ThreeDChart from "./drawExample";
import { sensor } from "../Data/SensorData";
import { rawData1 } from "../Data/chartData";
import { rawData2 } from "../Data/chartData2";

function ThreeDGraph() {
  const [loading, setLoading] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const [prevSyncFrequency, setPrevSyncFrequency] = useState(null);
  const [syncFrequecy, setsyncFrequency] = useState(null);
  const [data, setData] = useState(rawData1);

  //   const syncFreqvalue = useSelector((state) => state.stats.data.syncFreq);
  const syncFreqvalue = 50;

  const [maximizedChartId, setMaximizedChartId] = useState(null);

  useEffect(() => {
    if (isEmpty(data)) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [data]);

  useEffect(() => {
    if (prevSyncFrequency !== null) {
      if (
        Math.abs(syncFreqvalue - prevSyncFrequency > 10) &&
        syncFreqvalue !== prevSyncFrequency
      ) {
        setsyncFrequency(syncFreqvalue);
        setRenderKey((prev) => prev + 1);
      }
    } else {
      setsyncFrequency(syncFreqvalue);
    }
    setPrevSyncFrequency(syncFreqvalue);
  }, [syncFreqvalue, syncFrequecy, prevSyncFrequency]);

  useEffect(() => {
    const interval = setInterval(() => {
      // Get the current second
      const currentSecond = new Date().getSeconds();

      // Update the data state based on whether the current second is even or odd
      setData(currentSecond % 2 === 0 ? rawData1 : rawData2);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const filteredSensors = sensor.filter((s) =>
    data?.ch_list?.includes(s.id)
  );

  const handleMaximize = (chartId) => {
    setMaximizedChartId((prevId) => (prevId === chartId ? null : chartId));
  };

  const prpdCharts = filteredSensors.map((channel, index) => {
    const chartId = `prpdCH${String.fromCharCode(65 + index)}`;
    const isMaximized = chartId === maximizedChartId;
    const chartStyle = isMaximized ? { width: "100%", height: "400px" } : {};
    const { unit_of_measurement } = channel;
    const channelIndex =
    data?.ch_list == undefined
        ? -1
        : data?.ch_list.indexOf(channel.channel_id);
    const chartData =
      channelIndex == -1 ? [] : data?.prpd_index?.[channelIndex];

    if (channel != undefined && (isMaximized || !maximizedChartId)) {
      return (
        <Grid
          item
          xs={12}
          md={isMaximized ? 12 : 6}
          lg={isMaximized ? 12 : 6}
          key={chartId}
          style={chartStyle}
        >
          <div>
            <ThreeDChart
              data={chartData}
              chartId={chartId}
              title={channel?.display_name || ""}
              isMaximized={isMaximized}
              onMaximize={() => handleMaximize(chartId)}
              // eslint-disable-next-line camelcase
              UnitOfMeasurement={unit_of_measurement}
              ZAxis={syncFrequecy}
            />
          </div>
        </Grid>
      );
    }
    return null;
  });

  return (
    <div style={{ position: "relative" }}>
      {loading ? (
        <CircularProgress
          size={40}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            zIndex: 1000,
          }}
        />
      ) : (
        <Grid container spacing={2} key={renderKey}>
          {prpdCharts}
        </Grid>
      )}
    </div>
  );
}

ThreeDGraph.propTypes = {};

export default ThreeDGraph;
