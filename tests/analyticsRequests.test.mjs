import test from "node:test";
import assert from "node:assert/strict";

import axios from "axios";

import { fetchAnalyticsData } from "../src/utils/analyticsRequests.js";

test("fetchAnalyticsData запрашивает все endpoint и собирает результат", async () => {
  const calls = [];
  const originalGet = axios.get;
  axios.get = async (url, config) => {
    calls.push({ url, config });
    if (url.endsWith("/api/analytics/summary")) {
      return { data: { fields: 5 } };
    }
    if (url.endsWith("/api/analytics/crops/by-culture")) {
      return { data: { items: [{ culture: "Пшеница", records: 2 }] } };
    }
    if (url.endsWith("/api/analytics/crops/timeline-starts")) {
      return { data: { series: [{ month: "2026-04", count: 2 }] } };
    }
    if (url.endsWith("/api/analytics/crops/records")) {
      return { data: { items: [{ field_name: "Поле 1" }] } };
    }
    throw new Error(`Unexpected URL: ${url}`);
  };

  try {
    const result = await fetchAnalyticsData({
      apiBase: "http://localhost:8080",
      authorization: "Bearer token",
      selectedSeasonId: null,
      recordsLimit: 2000,
    });

    assert.equal(calls.length, 4);
    assert.equal(result.summary.fields, 5);
    assert.equal(result.byCulture.length, 1);
    assert.equal(result.timeline.length, 1);
    assert.equal(result.records.length, 1);
    assert.equal(calls[0].config.headers.Authorization, "Bearer token");
  } finally {
    axios.get = originalGet;
  }
});

test("fetchAnalyticsData передает season_id в params", async () => {
  const calls = [];
  const originalGet = axios.get;
  axios.get = async (url, config) => {
    calls.push({ url, config });
    return { data: {} };
  };

  try {
    await fetchAnalyticsData({
      apiBase: "http://localhost:8080",
      authorization: "Bearer token",
      selectedSeasonId: "season-1",
      recordsLimit: 50,
    });
    assert.equal(calls.length, 4);
    for (const call of calls) {
      assert.equal(call.config.params.season_id, "season-1");
    }
    const recordsCall = calls.find((call) => call.url.endsWith("/api/analytics/crops/records"));
    assert.equal(recordsCall.config.params.limit, 50);
  } finally {
    axios.get = originalGet;
  }
});

test("fetchAnalyticsData возвращает пустые коллекции по умолчанию", async () => {
  const originalGet = axios.get;
  axios.get = async () => ({ data: null });

  try {
    const result = await fetchAnalyticsData({
      apiBase: "http://localhost:8080",
      authorization: "Bearer token",
      selectedSeasonId: null,
      recordsLimit: 10,
    });
    assert.deepEqual(result.byCulture, []);
    assert.deepEqual(result.timeline, []);
    assert.deepEqual(result.records, []);
    assert.deepEqual(result.summary, {});
  } finally {
    axios.get = originalGet;
  }
});

test("fetchAnalyticsData пробрасывает ошибку если любой endpoint упал", async () => {
  const originalGet = axios.get;
  axios.get = async (url) => {
    if (url.endsWith("/api/analytics/summary")) {
      throw new Error("summary failed");
    }
    return { data: {} };
  };

  try {
    await assert.rejects(
      () =>
        fetchAnalyticsData({
          apiBase: "http://localhost:8080",
          authorization: "Bearer token",
          selectedSeasonId: null,
          recordsLimit: 10,
        }),
      /summary failed/
    );
  } finally {
    axios.get = originalGet;
  }
});
