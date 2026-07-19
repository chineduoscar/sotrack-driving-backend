import { zones } from "../data/zones.js";

export const getAllZones = (req, res) => {
  res.status(200).json({
    success: true,
    count: zones.length,
    data: zones,
  });
};

export const getSingleZone = (req, res) => {
  const id = Number(req.params.id);

  const zone = zones.find((z) => z.id === id);

  if (!zone) {
    return res.status(404).json({
      success: false,
      message: "Zone not found",
    });
  }

  res.status(200).json({
    success: true,
    data: zone,
  });
};
