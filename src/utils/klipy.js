const API_BASE = "https://api.klipy.com/api/v1";

export async function searchKlipyGifs({ apiKey, query, page, signal }) {
  if (!apiKey) {
    throw new Error("GIF search has not been configured yet.");
  }

  const endpoint = query.trim() ? "search" : "trending";
  const url = new URL(`${API_BASE}/${encodeURIComponent(apiKey)}/gifs/${endpoint}`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", "24");
  url.searchParams.set("format_filter", "gif,jpg");
  if (endpoint === "search") url.searchParams.set("q", query);

  const response = await fetch(url, { signal });
  if (response.status === 429) {
    throw new Error(
      "GIF search limit reached. Please wait a minute before trying again.",
    );
  }
  if (!response.ok) {
    throw new Error("GIF search is temporarily unavailable. Please try again later.");
  }

  const result = await response.json();
  const data = result?.data;
  if (
    result?.result !== true || !Array.isArray(data?.data) ||
    data.current_page !== page || typeof data.has_next !== "boolean"
  ) {
    throw new Error("GIF search returned an invalid response.");
  }

  const items = data.data.map((item) => {
    const gif = item?.file?.sm?.gif || item?.file?.md?.gif ||
      item?.file?.hd?.gif || item?.file?.xs?.gif;
    const thumbnail = item?.file?.sm?.jpg || item?.file?.md?.jpg ||
      item?.file?.hd?.jpg || item?.file?.xs?.jpg || gif;
    if (
      typeof item?.slug !== "string" || !item.slug ||
      typeof gif?.url !== "string" || typeof thumbnail?.url !== "string" ||
      new URL(gif.url).protocol !== "https:" ||
      new URL(thumbnail.url).protocol !== "https:"
    ) {
      throw new Error("GIF search returned an invalid response.");
    }
    return {
      id: item.slug,
      title: typeof item.title === "string" && item.title ? item.title : "GIF",
      gifUrl: gif.url,
      thumbnailUrl: thumbnail.url,
    };
  });

  return { items, nextPage: data.has_next ? page + 1 : null };
}

export async function registerKlipyShare({ apiKey, slug, query }) {
  await fetch(
    `${API_BASE}/${encodeURIComponent(apiKey)}/gifs/share/${encodeURIComponent(slug)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: query.trim() ? query : "" }),
      keepalive: true,
    },
  );
}
