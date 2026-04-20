import dayjs from "dayjs";

export const isMonday = (value) => dayjs(value).day() === 1;

export const getWeekEnd = (startDate) => dayjs(startDate).add(6, "day").format("YYYY-MM-DD");

export const getWeekdayName = (value) => dayjs(value).format("dddd");

export const formatDateTime = (value) => dayjs(value).format("MMM D, YYYY h:mm A");
