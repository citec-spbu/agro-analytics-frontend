import axios from "axios";

export async function fetchAnalyticsData({
  apiBase,
  authorization,
  selectedSeasonId,
  recordsLimit = 2000,
}) {
  const seasonParams = selectedSeasonId ? { season_id: selectedSeasonId } : {};
  const headers = { Authorization: authorization };

  const [summaryRes, byCultureRes, timelineRes, recordsRes] = await Promise.all([
    axios.get(`${apiBase}/api/analytics/summary`, {
      headers,
      params: seasonParams,
    }),
    axios.get(`${apiBase}/api/analytics/crops/by-culture`, {
      headers,
      params: seasonParams,
    }),
    axios.get(`${apiBase}/api/analytics/crops/timeline-starts`, {
      headers,
      params: seasonParams,
    }),
    axios.get(`${apiBase}/api/analytics/crops/records`, {
      headers,
      params: { ...seasonParams, limit: recordsLimit },
    }),
  ]);

  return {
    summary: summaryRes.data || {},
    byCulture: byCultureRes.data?.items || [],
    timeline: timelineRes.data?.series || [],
    records: recordsRes.data?.items || [],
  };
}
