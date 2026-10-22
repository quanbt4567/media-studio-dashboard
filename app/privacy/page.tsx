import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chính sách quyền riêng tư — BCN Media Desk",
  description:
    "Chính sách quyền riêng tư của ứng dụng Clubhouse Media Desk App (BCN Media Desk), Ban Công Nghệ — IUH.",
};

const sections: { title: string; body: string[] }[] = [
  {
    title: "1. Giới thiệu",
    body: [
      "Clubhouse Media Desk App (gọi là “BCN Media Desk”) là công cụ nội bộ của Ban Công Nghệ — Câu lạc bộ công nghệ sinh viên Trường Đại học Công Nghiệp TP.HCM (IUH), dùng để soạn thảo, duyệt và đăng nội dung lên Fanpage Facebook của Ban.",
      "Chính sách này giải thích ứng dụng thu thập dữ liệu gì, dùng vào việc gì và quyền của bạn.",
    ],
  },
  {
    title: "2. Dữ liệu chúng tôi thu thập",
    body: [
      "Tài khoản nội bộ: tên đăng nhập và vai trò (admin / designer / writer) của thành viên Ban do quản trị viên cấp. Mật khẩu được lưu dưới dạng mã hóa một chiều.",
      "Dữ liệu Fanpage qua Facebook Graph API: nội dung bài viết, hình ảnh/video đính kèm, và số liệu tương tác công khai (lượt thích, bình luận, chia sẻ, lượt tiếp cận) của Trang do Ban quản lý, phục vụ việc đăng bài và xem thống kê.",
      "Nội dung do người dùng tạo: bản nháp bài viết, bình luận trao đổi nội bộ, tin nhắn trong nhóm chat của ứng dụng, và thư viện ảnh dùng chung.",
      "Khóa API (Gemini, xKiro, Facebook, Vercel Blob): do quản trị viên nhập trong trang Cài đặt, được mã hóa AES-256-GCM trước khi lưu trữ.",
      "Chúng tôi KHÔNG thu thập dữ liệu cá nhân của khách truy cập Fanpage, không chạy quảng cáo và không bán dữ liệu.",
    ],
  },
  {
    title: "3. Mục đích sử dụng",
    body: [
      "Dữ liệu chỉ được dùng để vận hành công cụ quản lý truyền thông nội bộ: đăng nhập phân quyền, đăng bài lên Fanpage, lên lịch đăng tự động, thống kê hiệu quả bài viết và trao đổi công việc giữa các thành viên.",
    ],
  },
  {
    title: "4. Lưu trữ và bảo mật",
    body: [
      "Dữ liệu được lưu trên hạ tầng Supabase/Vercel. Mật khẩu dùng thuật toán băm một chiều; khóa API được mã hóa; phiên đăng nhập dùng cookie httpOnly.",
      "Chỉ thành viên Ban Công Nghệ có tài khoản mới truy cập được ứng dụng. Bài viết đăng lên Fanpage tuân theo chế độ hiển thị công khai của Trang.",
    ],
  },
  {
    title: "5. Chia sẻ dữ liệu",
    body: [
      "Chúng tôi không chia sẻ dữ liệu người dùng cho bên thứ ba, ngoại trừ các dịch vụ hạ tầng cần thiết để ứng dụng hoạt động (Meta/Facebook Graph API, Google Gemini, xKiro, Supabase, Vercel) và trong phạm vi mục đích nêu tại Mục 3.",
    ],
  },
  {
    title: "6. Quyền của bạn",
    body: [
      "Thành viên có thể yêu cầu xem, chỉnh sửa hoặc xóa dữ liệu cá nhân của mình (tài khoản, bài viết nháp, tin nhắn) bằng cách liên hệ quản trị viên của Ban. Yêu cầu xóa bài viết đã đăng công khai trên Fanpage được thực hiện trực tiếp trên Trang Facebook.",
    ],
  },
  {
    title: "7. Liên hệ",
    body: [
      "Mọi thắc mắc về chính sách này, vui lòng liên hệ: Ban Công Nghệ (IUH) — email mediabancongnghe@gmail.com — hoặc qua Messenger của Fanpage.",
    ],
  },
  {
    title: "8. Cập nhật chính sách",
    body: [
      "Chính sách có thể được cập nhật khi ứng dụng thay đổi. Phiên bản hiện tại có hiệu lực từ ngày 20/10/2026.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen studio-canvas px-4 py-10 text-[var(--ink)] sm:px-8">
      <div className="mx-auto max-w-3xl rounded-[28px] border border-white/75 bg-[var(--surface)]/80 p-6 shadow-[0_24px_80px_rgba(0,0,0,.12)] backdrop-blur-2xl sm:p-10">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[.2em] text-[#b3541e]">
          BCN Media Desk
        </p>
        <h1 className="text-3xl font-black tracking-[-.04em] sm:text-4xl">
          Chính sách quyền riêng tư
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Áp dụng cho ứng dụng Clubhouse Media Desk App — công cụ quản lý
          Fanpage nội bộ của Ban Công Nghệ (IUH).
        </p>
        <div className="mt-8 space-y-7">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="mb-2 text-base font-extrabold">{s.title}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="mb-2 text-sm leading-relaxed text-[#3d443c]">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
        <p className="mt-10 border-t border-[#e3e6dd] pt-4 font-mono text-[10px] uppercase tracking-[.18em] text-[var(--muted)]">
          Cập nhật lần cuối: 20/10/2026
        </p>
      </div>
    </main>
  );
}
