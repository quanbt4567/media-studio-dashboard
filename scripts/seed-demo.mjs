/**
 * Seed demo data for the Media Desk report/demo.
 *
 * Usage:  node scripts/seed-demo.mjs
 * Run from the project root. Creates data/posts.json with 6 realistic
 * Vietnamese posts covering every status (Draft → Published), including
 * comments, review history and activity timelines.
 *
 * If data/posts.json already exists it is backed up to
 * data/posts.backup-<timestamp>.json first — nothing is lost.
 */

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(here, "..", "data");
const POSTS_FILE = path.join(DATA_DIR, "posts.json");

const now = Date.now();
const iso = (ms) => new Date(ms).toISOString();
const HOUR = 3600_000;
const DAY = 24 * HOUR;

let seq = 0;
const aid = (prefix) => `${prefix}-${(++seq).toString().padStart(2, "0")}`;

function activity(by, action, at) {
  return { id: aid("act"), at: iso(at), by, action };
}
function comment(author, role, text, at) {
  return { id: aid("cmt"), author, role, text, createdAt: iso(at) };
}

const posts = [
  // 1. Draft — writer đang viết dở
  {
    id: "demo-draft-01",
    content:
      "🎨 WORKSHOP CANVA CHO NGƯỜ MỚI BẮT ĐẦU\n\n" +
      "Bạn muốn tự tay thiết kế poster, banner cho CLB mà chưa biết bắt đầu từ đâu?\n" +
      "Workshop lần này sẽ cầm tay chỉ việc từ con số 0: chọn font, phối màu, bố cục...\n\n" +
      "⏰ Thời gian: 19h30 thứ 6 tuần này\n" +
      "📍 Địa điểm: Phòng B.204\n\n" +
      "(đang viết dở — chưa thêm hashtag)",
    status: "Draft",
    comments: [],
    activity: [
      activity("writer", "created the post", now - 5 * HOUR),
      activity("writer", "updated the post", now - 2 * HOUR),
    ],
    createdBy: "writer",
    updatedBy: "writer",
    createdAt: iso(now - 5 * HOUR),
    updatedAt: iso(now - 2 * HOUR),
  },

  // 2. Waiting Media — chờ designer gắn ảnh
  {
    id: "demo-waiting-media-02",
    content:
      "📣 TUYỂN THÀNH VIÊN BAN TRUYỀN THÔNG — ĐỢT 2\n\n" +
      "Ban Truyền thông cần thêm 5 bạn đồng hành cho học kỳ này:\n" +
      "✍️ 2 bạn viết content\n" +
      "🎨 2 bạn thiết kế\n" +
      "📸 1 bạn chụp ảnh\n\n" +
      "Không yêu cầu kinh nghiệm — chỉ cần nhiệt tình và đúng deadline.\n" +
      "📝 Đăng ký tại link dưới comment nhé!\n\n" +
      "#TuyenThanhVien #CLB #TruyenThong",
    status: "Waiting Media",
    comments: [
      comment("designer", "media", "Banner đang vẽ, tối nay mình gắn vào nhé 🎨", now - 3 * HOUR),
      comment("writer", "content", "Ok bạn, mình đã chốt text rồi, chỉ chờ ảnh thôi.", now - 2.5 * HOUR),
    ],
    activity: [
      activity("writer", "created the post", now - 26 * HOUR),
      activity("writer", "moved the post to Waiting Media", now - 25 * HOUR),
      activity("designer", "commented on the post", now - 3 * HOUR),
    ],
    createdBy: "writer",
    updatedBy: "designer",
    createdAt: iso(now - 26 * HOUR),
    updatedAt: iso(now - 2.5 * HOUR),
  },

  // 3. Review Pending — bài "ngôi sao" để demo duyệt trực tiếp
  {
    id: "demo-review-03",
    content:
      "🏮 RECAP ĐÊM HỘI TRĂNG RẰM\n\n" +
      "Tối qua sân trường mình sáng đèn hơn mọi năm — gần 200 bạn đã cùng nhau phá cỗ, " +
      "rước đèn và xem văn nghệ đến tận 22h.\n\n" +
      "Cảm ơn team Hậu cần đã chuẩn bị 150 phần quà, team Văn nghệ với 8 tiết mục " +
      "cực cháy, và tất cả các bạn đã đến chung vui 💛\n\n" +
      "📸 Full album ảnh ở comment đầu tiên nhé!\n\n" +
      "#TrungThu #Recap #CLB #TuoiTre",
    status: "Review Pending",
    comments: [
      comment("writer", "content", "Mọi người xem giúp mình phần hashtag có ổn không?", now - 4 * HOUR),
      comment("designer", "media", "Ảnh bìa mình gắn xong rồi, nhìn ưng lắm 👍", now - 3.5 * HOUR),
    ],
    activity: [
      activity("writer", "created the post", now - 30 * HOUR),
      activity("writer", "moved the post to Waiting Media", now - 29 * HOUR),
      activity("designer", "attached a cover image", now - 28 * HOUR),
      activity("designer", "moved the post to Review Pending", now - 27 * HOUR),
    ],
    createdBy: "writer",
    updatedBy: "designer",
    createdAt: iso(now - 30 * HOUR),
    updatedAt: iso(now - 3.5 * HOUR),
  },

  // 4. Approved + scheduled — hiện trên Calendar
  {
    id: "demo-scheduled-04",
    content:
      "📅 LỊCH HỌP CLB TUẦN NÀY\n\n" +
      "⏰ 18h30 thứ 4 — họp toàn CLB tại phòng A.101\n" +
      "Nội dung: tổng kết tháng, phân công sự kiện cuối kỳ.\n\n" +
      "Bạn nào bận thì báo lại cho mình trước thứ 3 nhé 🙏\n\n" +
      "#ThongBao #CLB",
    status: "Approved",
    scheduledAt: iso(now + 3 * HOUR),
    comments: [],
    activity: [
      activity("writer", "created the post", now - 20 * HOUR),
      activity("designer", "moved the post to Review Pending", now - 19 * HOUR),
      activity("admin", "approved the post ✓", now - 18 * HOUR),
      activity("admin", "scheduled the post", now - 18 * HOUR),
    ],
    review: { decision: "approved", by: "admin", at: iso(now - 18 * HOUR), note: "Ngắn gọn, rõ ràng. Duyệt!" },
    createdBy: "writer",
    updatedBy: "admin",
    createdAt: iso(now - 20 * HOUR),
    updatedAt: iso(now - 18 * HOUR),
  },

  // 5. Published — bài "hot" để demo tab Thống kê
  {
    id: "demo-published-05",
    content:
      "🎉 CHÀO MỪNG 25 TÂN THÀNH VIÊN\n\n" +
      "Sau 2 tuần tuyển quân, gia đình mình đã có thêm 25 gương mặt mới đầy năng lượng!\n\n" +
      "Buổi gặp mặt đầu tiên: 18h thứ 7 tuần này tại sảnh B — có game, có quà, có đồ ăn 😋\n" +
      "Các anh chị khóa trên nhớ đến chào đón đàn em nhé!\n\n" +
      "#TanThanhVien #CLB #Welcome",
    status: "Published",
    publishedAt: iso(now - 2 * DAY),
    facebookPostId: "demo_fb_001",
    metrics: { likes: 214, comments: 38, shares: 21, updatedAt: iso(now - 1 * DAY) },
    comments: [
      comment("admin", "admin", "Bài này tương tác tốt nhất tháng, team content tham khảo cách viết nhé.", now - 1 * DAY),
    ],
    activity: [
      activity("writer", "created the post", now - 4 * DAY),
      activity("admin", "approved the post ✓", now - 3 * DAY),
      activity("admin", "published to Facebook (demo_fb_001)", now - 2 * DAY),
    ],
    review: { decision: "approved", by: "admin", at: iso(now - 3 * DAY), note: "" },
    createdBy: "writer",
    updatedBy: "admin",
    createdAt: iso(now - 4 * DAY),
    updatedAt: iso(now - 1 * DAY),
  },

  // 6. Published — bài tương tác thấp hơn để so sánh
  {
    id: "demo-published-06",
    content:
      "📌 LỊCH SINH HOẠT THÁNG 10\n\n" +
      "Các buổi sinh hoạt định kỳ vẫn diễn ra vào 18h thứ 5 hàng tuần tại phòng A.101.\n" +
      "Tháng này có thêm 1 buổi ngoại khóa vào cuối tháng, chi tiết sẽ thông báo sau.\n\n" +
      "#ThongBao #CLB",
    status: "Published",
    publishedAt: iso(now - 5 * DAY),
    facebookPostId: "demo_fb_002",
    metrics: { likes: 96, comments: 12, shares: 5, updatedAt: iso(now - 1 * DAY) },
    comments: [],
    activity: [
      activity("writer", "created the post", now - 7 * DAY),
      activity("admin", "approved the post ✓", now - 6 * DAY),
      activity("admin", "published to Facebook (demo_fb_002)", now - 5 * DAY),
    ],
    review: { decision: "approved", by: "admin", at: iso(now - 6 * DAY), note: "" },
    createdBy: "writer",
    updatedBy: "admin",
    createdAt: iso(now - 7 * DAY),
    updatedAt: iso(now - 1 * DAY),
  },
];

async function main() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(POSTS_FILE);
    const backup = path.join(DATA_DIR, `posts.backup-${Date.now()}.json`);
    await fs.copyFile(POSTS_FILE, backup);
    console.log(`Đã backup dữ liệu cũ → ${path.basename(backup)}`);
  } catch {
    // chưa có file cũ — không cần backup
  }
  await fs.writeFile(POSTS_FILE, JSON.stringify(posts, null, 2), "utf-8");
  console.log(`Đã tạo ${posts.length} bài demo trong data/posts.json:`);
  for (const p of posts) {
    console.log(`  - [${p.status}] ${p.content.split("\n")[0].slice(0, 50)}`);
  }
  console.log("\nGợi ý demo trực tiếp: đăng nhập admin → mở bài 'RECAP ĐÊM HỘI TRĂNG RẰM' (Review Pending) → bấm Approve → Publish.");
}

main().catch((err) => {
  console.error("Seed thất bại:", err.message);
  process.exit(1);
});
