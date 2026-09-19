import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          background: "#FB651E",
          color: "#000000",
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: "-0.04em",
        }}
      >
        O
      </div>
    ),
    size,
  );
}
