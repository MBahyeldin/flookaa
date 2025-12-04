import { useTheme } from "@/Theme.context";
import { SunMoon } from "lucide-react"

export const ToggleTheme = () => {
    const { isDarkMode, toggleTheme } = useTheme();
    return (
        <div className="cursor-pointer" onClick={toggleTheme}>
            {isDarkMode ? <SunMoon size={24} /> : <SunMoon size={24} />}
        </div>
    )
}