# EduQuiz Pro — Firebase + Netlify (bản nền)

Bản này giữ nguyên HTML được cung cấp trong `public/index.html` và thêm bộ khung backend bảo mật. **Đây chưa phải bản tích hợp hoàn chỉnh vào giao diện**: đăng nhập hiện tại trong HTML vẫn dùng dữ liệu cục bộ. Không đưa website này vào sử dụng thật cho đến khi hoàn tất bước nối giao diện, phân quyền lớp/đề/bài nộp và kiểm thử.

## Đã có
- Cấu trúc Netlify Functions.
- Firebase Admin SDK ở phía server.
- Endpoint kiểm tra API: `/.netlify/functions/health`
- Endpoint tra username để đăng nhập bằng tên tài khoản.
- Endpoint Admin tạo tài khoản giáo viên/học sinh, chỉ người có hồ sơ `role: admin` và trạng thái `active` mới gọi được.
- Firestore rules mặc định deny-by-default.
- HTML gốc được giữ nguyên để không mất chức năng.

## Cần cấu hình bảo mật trên Netlify
Trong Project configuration → Environment variables, thêm:
- `FIREBASE_PROJECT_ID` = `eduquiz-bef6d`
- `FIREBASE_SERVICE_ACCOUNT_JSON` = toàn bộ JSON Service Account của đúng project.

Service Account JSON là bí mật tuyệt đối: chỉ lưu trong Netlify Environment Variables, không commit lên GitHub, không gửi qua chat.

## Cách triển khai
1. Giải nén ZIP.
2. Đưa nội dung thư mục vào repository GitHub đã kết nối Netlify (giữ cấu trúc thư mục).
3. Netlify tự build/deploy. Publish directory là `public`.
4. Kiểm tra `https://TEN-SITE.netlify.app/.netlify/functions/health` trả `{ "ok": true, ... }`.
5. Chưa thay Firestore Rules hiện tại cho tới khi kiểm tra chắc chắn project/UID Admin và các rule phù hợp. File `firestore.rules` trong gói đang khóa toàn bộ truy cập client theo nguyên tắc an toàn.

## Cảnh báo quan trọng về dữ liệu hiện tại
HTML gốc chứa tài khoản mẫu và cơ chế xác thực bằng mật khẩu trong localStorage. Bản nền này chưa loại bỏ/di chuyển dữ liệu đó và chưa thay thế luồng đăng nhập. Không dùng tài khoản mẫu cho dữ liệu thật.

## Việc còn lại trước khi vận hành
- Bootstrap/kiểm tra hồ sơ Admin hiện tại trong `users/{UID}` (role phải là `admin`, status `active`).
- Nối form đăng nhập HTML với Firebase Auth (username lookup → signInWithEmailAndPassword).
- Nối tạo tài khoản Admin với Function; giáo viên chỉ được cấp học sinh thuộc lớp mình.
- Chuyển classes, quizzes, questions, answer keys, submissions, materials sang Firestore.
- Tách đáp án khỏi dữ liệu học sinh đọc được; chấm điểm phía server.
- Thiết kế và kiểm thử Firestore Rules theo quyền từng lớp.
- Bổ sung rate limiting, đổi mật khẩu lần đầu, xử lý file Storage và kiểm thử phục hồi dữ liệu.

## Lưu ý về Firebase username
Tài khoản dùng email nội bộ dạng `username@eduquiz.invalid`; đây là định danh đăng nhập Firebase, không phải hộp thư nhận email. Không dùng chức năng gửi email đặt lại mật khẩu cho loại tài khoản này; cần luồng đặt lại mật khẩu do Admin/giáo viên được phân quyền thực hiện ở backend.
