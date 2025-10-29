import axiosClient from "./axiosClient"

// Thay đổi Telegram username
const updateTelegramUsername = (telegram_username: string) => {
  return axiosClient.patch("/users/me/telegram", { telegram_username })
}

// Thay đổi mật khẩu
interface ChangePasswordPayload {
  current_password: string
  new_password: string
}

const changePassword = (data: ChangePasswordPayload) => {
  return axiosClient.patch("/users/me/password", data)
}

const settingsApi = {
  updateTelegramUsername,
  changePassword,
}

export default settingsApi