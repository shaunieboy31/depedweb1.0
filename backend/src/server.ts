import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { prisma } from "./lib/prisma";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());

function parseCookies(cookieHeader?: string) {
  if (!cookieHeader) return {};
  return cookieHeader
    .split(";")
    .reduce<Record<string, string>>((acc, cookie) => {
      const [name, ...rest] = cookie.split("=");
      acc[name.trim()] = decodeURIComponent(rest.join("=").trim());
      return acc;
    }, {});
}

function getAuthSession(req: express.Request) {
  const cookies = parseCookies(req.headers.cookie);
  const raw = cookies["auth_session"];
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function sendError(res: express.Response, message: string, status = 500) {
  return res.status(status).json({ success: false, error: message });
}

const defaultContactInfo = {
  id: 0,
  location: "Toclong I-C, Imus City, Cavite, 4103",
  phone: "(046) 419-8450 local 204 or 227",
  email: "sgod.imus@deped.gov.ph",
  officeHours: "Mon - Fri: 8:00 AM - 5:00 PM",
  facebook: "",
  twitter: "",
  youtube: "",
  website: "",
};

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 1000 * 60 * 60 * 24,
  path: "/",
};

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return sendError(res, "Username and password are required.", 400);
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return sendError(res, "Invalid username or password.", 401);
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return sendError(res, "Invalid username or password.", 401);
    }

    const sessionData = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    res.cookie("auth_session", JSON.stringify(sessionData), cookieOptions);
    return res.json({ success: true, data: sessionData });
  } catch (error) {
    console.error("Login error:", error);
    return sendError(res, "Failed to log in.");
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("auth_session", { path: "/" });
  res.json({ success: true });
});

app.get("/api/auth/session", (req, res) => {
  const session = getAuthSession(req);
  return res.json({ success: true, data: session });
});

app.get("/api/contact", async (req, res) => {
  try {
    const contact = await prisma.contactInfo.findFirst();
    return res.json({ success: true, data: contact || defaultContactInfo });
  } catch (error) {
    console.error("Error fetching contact info:", error);
    return sendError(res, "Failed to fetch contact info.");
  }
});

app.post("/api/contact", async (req, res) => {
  const contactData = req.body;

  try {
    const existing = await prisma.contactInfo.findFirst();
    const result = existing
      ? await prisma.contactInfo.update({
          where: { id: existing.id },
          data: contactData,
        })
      : await prisma.contactInfo.create({
          data: contactData,
        });

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error updating contact info:", error);
    return sendError(res, "Failed to update contact info.");
  }
});

app.get("/api/news", async (req, res) => {
  try {
    const news = await prisma.news.findMany({
      orderBy: { id: "asc" },
    });
    return res.json({ success: true, data: news });
  } catch (error) {
    console.error("Error fetching news:", error);
    return sendError(res, "Failed to fetch news.");
  }
});

app.get("/api/news/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const item = await prisma.news.findUnique({ where: { id } });
    if (!item) return sendError(res, "News article not found.", 404);
    return res.json({ success: true, data: item });
  } catch (error) {
    console.error("Error fetching news item:", error);
    return sendError(res, "Failed to fetch news item.");
  }
});

app.post("/api/news", async (req, res) => {
  try {
    const item = await prisma.news.create({ data: req.body });
    return res.json({ success: true, data: item });
  } catch (error) {
    console.error("Error creating news article:", error);
    return sendError(res, "Failed to create news article.");
  }
});

app.put("/api/news/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const item = await prisma.news.update({
      where: { id },
      data: req.body,
    });
    return res.json({ success: true, data: item });
  } catch (error) {
    console.error("Error updating news article:", error);
    return sendError(res, "Failed to update news article.");
  }
});

app.delete("/api/news/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.news.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error("Error deleting news article:", error);
    return sendError(res, "Failed to delete news article.");
  }
});

app.get("/api/carousel", async (req, res) => {
  try {
    const slides = await prisma.carouselSlide.findMany({
      orderBy: { createdAt: "desc" },
    });
    return res.json({ success: true, data: slides });
  } catch (error) {
    console.error("Error fetching carousel slides:", error);
    return sendError(res, "Failed to fetch carousel slides.");
  }
});

app.post("/api/carousel", async (req, res) => {
  try {
    const slide = await prisma.carouselSlide.create({ data: req.body });
    return res.json({ success: true, data: slide });
  } catch (error) {
    console.error("Error creating carousel slide:", error);
    return sendError(res, "Failed to create carousel slide.");
  }
});

app.delete("/api/carousel/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.carouselSlide.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error("Error deleting carousel slide:", error);
    return sendError(res, "Failed to delete carousel slide.");
  }
});

app.get("/api/transparency", async (req, res) => {
  try {
    const items = await prisma.transparencySeal.findMany({
      orderBy: [{ category: "asc" }, { order: "asc" }],
    });
    return res.json({ success: true, data: items });
  } catch (error) {
    console.error("Error fetching transparency items:", error);
    return sendError(res, "Failed to fetch transparency items.");
  }
});

app.post("/api/transparency", async (req, res) => {
  try {
    const item = await prisma.transparencySeal.create({ data: req.body });
    return res.json({ success: true, data: item });
  } catch (error) {
    console.error("Error creating transparency item:", error);
    return sendError(res, "Failed to create transparency item.");
  }
});

app.put("/api/transparency/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const item = await prisma.transparencySeal.update({
      where: { id },
      data: req.body,
    });
    return res.json({ success: true, data: item });
  } catch (error) {
    console.error("Error updating transparency item:", error);
    return sendError(res, "Failed to update transparency item.");
  }
});

app.delete("/api/transparency/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.transparencySeal.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error("Error deleting transparency item:", error);
    return sendError(res, "Failed to delete transparency item.");
  }
});

app.get("/api/employee-honors", async (req, res) => {
  try {
    const honors = await prisma.employeeHonor.findMany({
      orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    });
    return res.json({ success: true, data: honors });
  } catch (error) {
    console.error("Error fetching employee honors:", error);
    return sendError(res, "Failed to fetch employee honors.");
  }
});

app.post("/api/employee-honors", async (req, res) => {
  try {
    const honor = await prisma.employeeHonor.create({ data: req.body });
    return res.json({ success: true, data: honor });
  } catch (error) {
    console.error("Error creating employee honor:", error);
    return sendError(res, "Failed to create employee honor.");
  }
});

app.put("/api/employee-honors/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const honor = await prisma.employeeHonor.update({
      where: { id },
      data: req.body,
    });
    return res.json({ success: true, data: honor });
  } catch (error) {
    console.error("Error updating employee honor:", error);
    return sendError(res, "Failed to update employee honor.");
  }
});

app.delete("/api/employee-honors/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.employeeHonor.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error("Error deleting employee honor:", error);
    return sendError(res, "Failed to delete employee honor.");
  }
});

app.get("/api/issuances", async (req, res) => {
  try {
    const { category, type } = req.query;
    const where: any = {};
    if (category) where.category = String(category);
    if (type) where.type = String(type);

    const issuances = await prisma.issuance.findMany({
      where,
      orderBy: [{ year: "desc" }, { number: "desc" }, { createdAt: "desc" }],
    });
    return res.json({ success: true, data: issuances });
  } catch (error) {
    console.error("Error fetching issuances:", error);
    return sendError(res, "Failed to fetch issuances.");
  }
});

app.post("/api/issuances", async (req, res) => {
  try {
    const issuance = await prisma.issuance.create({ data: req.body });
    return res.json({ success: true, data: issuance });
  } catch (error) {
    console.error("Error creating issuance:", error);
    return sendError(res, "Failed to create issuance.");
  }
});

app.put("/api/issuances/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const issuance = await prisma.issuance.update({
      where: { id },
      data: req.body,
    });
    return res.json({ success: true, data: issuance });
  } catch (error) {
    console.error("Error updating issuance:", error);
    return sendError(res, "Failed to update issuance.");
  }
});

app.delete("/api/issuances/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.issuance.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error("Error deleting issuance:", error);
    return sendError(res, "Failed to delete issuance.");
  }
});

app.get("/api/leaders", async (req, res) => {
  try {
    const leaders = await prisma.leader.findMany({
      orderBy: { createdAt: "asc" },
    });
    return res.json({ success: true, data: leaders });
  } catch (error) {
    console.error("Error fetching leaders:", error);
    return sendError(res, "Failed to fetch leaders.");
  }
});

app.post("/api/leaders", async (req, res) => {
  try {
    const leader = await prisma.leader.create({ data: req.body });
    return res.json({ success: true, data: leader });
  } catch (error) {
    console.error("Error creating leader:", error);
    return sendError(res, "Failed to create leader.");
  }
});

app.put("/api/leaders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const leader = await prisma.leader.update({
      where: { id },
      data: req.body,
    });
    return res.json({ success: true, data: leader });
  } catch (error) {
    console.error("Error updating leader:", error);
    return sendError(res, "Failed to update leader.");
  }
});

app.delete("/api/leaders/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.leader.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error("Error deleting leader:", error);
    return sendError(res, "Failed to delete leader.");
  }
});

app.get("/api/schools", async (req, res) => {
  try {
    const schools = await prisma.school.findMany({ orderBy: { name: "asc" } });
    return res.json({ success: true, data: schools });
  } catch (error) {
    console.error("Error fetching schools:", error);
    return sendError(res, "Failed to fetch schools.");
  }
});

app.get("/api/schools/stats", async (req, res) => {
  try {
    const allSchools = await prisma.school.findMany();
    return res.json({
      success: true,
      data: {
        total: allSchools.length,
        public: allSchools.filter((school) => school.type === "PUBLIC").length,
        private: allSchools.filter((school) => school.type === "PRIVATE")
          .length,
        elementary: allSchools.filter(
          (school) => school.category.toUpperCase() === "ELEMENTARY",
        ).length,
        juniorHigh: allSchools.filter(
          (school) => school.category.toUpperCase() === "JHS",
        ).length,
        seniorHigh: allSchools.filter(
          (school) => school.category.toUpperCase() === "SHS",
        ).length,
        integrated: allSchools.filter(
          (school) => school.category.toUpperCase() === "INTEGRATED",
        ).length,
      },
    });
  } catch (error) {
    console.error("Error fetching school stats:", error);
    return sendError(res, "Failed to fetch school stats.");
  }
});

app.get("/api/schools/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const school = await prisma.school.findUnique({ where: { id } });
    if (!school) return sendError(res, "School not found.", 404);
    return res.json({ success: true, data: school });
  } catch (error) {
    console.error("Error fetching school:", error);
    return sendError(res, "Failed to fetch school.");
  }
});

app.post("/api/schools", async (req, res) => {
  try {
    const school = await prisma.school.create({ data: req.body });
    return res.json({ success: true, data: school });
  } catch (error) {
    console.error("Error creating school:", error);
    return sendError(res, "Failed to create school.");
  }
});

app.put("/api/schools/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const school = await prisma.school.update({
      where: { id },
      data: req.body,
    });
    return res.json({ success: true, data: school });
  } catch (error) {
    console.error("Error updating school:", error);
    return sendError(res, "Failed to update school.");
  }
});

app.delete("/api/schools/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.school.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error("Error deleting school:", error);
    return sendError(res, "Failed to delete school.");
  }
});

app.get("/api/org-charts", async (req, res) => {
  try {
    const charts = await prisma.orgChart.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return res.json({ success: true, data: charts });
  } catch (error) {
    console.error("Error fetching org charts:", error);
    return sendError(res, "Failed to fetch org charts.");
  }
});

app.post("/api/org-charts", async (req, res) => {
  try {
    const chart = await prisma.orgChart.create({ data: req.body });
    return res.json({ success: true, data: chart });
  } catch (error) {
    console.error("Error creating org chart:", error);
    return sendError(res, "Failed to create org chart.");
  }
});

app.put("/api/org-charts/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const chart = await prisma.orgChart.update({
      where: { id },
      data: req.body,
    });
    return res.json({ success: true, data: chart });
  } catch (error) {
    console.error("Error updating org chart:", error);
    return sendError(res, "Failed to update org chart.");
  }
});

app.delete("/api/org-charts/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.orgChart.delete({ where: { id } });
    return res.json({ success: true });
  } catch (error) {
    console.error("Error deleting org chart:", error);
    return sendError(res, "Failed to delete org chart.");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
