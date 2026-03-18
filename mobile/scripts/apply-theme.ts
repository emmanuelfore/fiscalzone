import fs from "fs";
import path from "path";

const targetFile = path.join(
  __dirname,
  "..",
  "src",
  "screens",
  "POSScreen.tsx"
);

function applyTheme() {
  let content = fs.readFileSync(targetFile, "utf8");

  // 1. Add the state hook
  if (!content.includes("const [isDarkMode, setIsDarkMode] = useState(true);")) {
    content = content.replace(
      'const [cashierName, setCashierName] = useState<string>("Cashier");',
      'const [cashierName, setCashierName] = useState<string>("Cashier");\n  const [isDarkMode, setIsDarkMode] = useState(true);'
    );
  }

  // 2. Add an import for Moon / Sun
  if (!content.includes("Moon") && !content.includes("Sun")) {
    content = content.replace(
      'import {\n  ShoppingCart,',
      'import {\n  Moon,\n  Sun,\n  ShoppingCart,'
    );
  }

  // 3. Simple text replacements for colors
  content = content.replace(/color:\s*"white"/g, 'color: isDarkMode ? "white" : "#111827"');
  content = content.replace(/color:\s*"rgba\(255,255,255,0\.4\)"/g, 'color: isDarkMode ? "rgba(255,255,255,0.4)" : "#6b7280"');
  content = content.replace(/color:\s*"rgba\(255,255,255,0\.45\)"/g, 'color: isDarkMode ? "rgba(255,255,255,0.45)" : "#6b7280"');
  content = content.replace(/color:\s*"rgba\(255,255,255,0\.6\)"/g, 'color: isDarkMode ? "rgba(255,255,255,0.6)" : "#4b5563"');
  content = content.replace(/color:\s*"rgba\(255,255,255,0\.65\)"/g, 'color: isDarkMode ? "rgba(255,255,255,0.65)" : "#4b5563"');
  content = content.replace(/color:\s*"rgba\(255,255,255,0\.8\)"/g, 'color: isDarkMode ? "rgba(255,255,255,0.8)" : "#374151"');

  // Backgrounds
  content = content.replace(/backgroundColor:\s*"#0a0600"/g, 'backgroundColor: isDarkMode ? "#0a0600" : "#f3f4f6"');
  content = content.replace(/backgroundColor:\s*"#1a140a"/g, 'backgroundColor: isDarkMode ? "#1a140a" : "#ffffff"');
  content = content.replace(/backgroundColor:\s*"rgba\(255,255,255,0\.05\)"/g, 'backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "#e5e7eb"');
  content = content.replace(/backgroundColor:\s*"rgba\(255,255,255,0\.04\)"/g, 'backgroundColor: isDarkMode ? "rgba(255,255,255,0.04)" : "#e5e7eb"');
  content = content.replace(/backgroundColor:\s*"rgba\(255,255,255,0\.03\)"/g, 'backgroundColor: isDarkMode ? "rgba(255,255,255,0.03)" : "#f9fafb"');
  content = content.replace(/backgroundColor:\s*"rgba\(255,255,255,0\.07\)"/g, 'backgroundColor: isDarkMode ? "rgba(255,255,255,0.07)" : "#d1d5db"');
  content = content.replace(/backgroundColor:\s*"rgba\(255,255,255,0\.08\)"/g, 'backgroundColor: isDarkMode ? "rgba(255,255,255,0.08)" : "#d1d5db"');

  // Borders
  content = content.replace(/borderColor:\s*"rgba\(255,255,255,0\.08\)"/g, 'borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "#d1d5db"');
  content = content.replace(/borderColor:\s*"rgba\(255,255,255,0\.1\)"/g, 'borderColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#d1d5db"');
  content = content.replace(/borderColor:\s*"rgba\(255,255,255,0\.06\)"/g, 'borderColor: isDarkMode ? "rgba(255,255,255,0.06)" : "#e5e7eb"');
  content = content.replace(/borderColor:\s*"rgba\(255,255,255,0\.07\)"/g, 'borderColor: isDarkMode ? "rgba(255,255,255,0.07)" : "#e5e7eb"');

  // Gradients
  content = content.replace(
    /colors=\{\s*inCart \? \["#2c1800", "#1e1000"\] : \["#1a1208", "#130e05"\]\s*\}/g,
    'colors={inCart ? (isDarkMode ? ["#2c1800", "#1e1000"] : ["#fffbeb", "#fef3c7"]) : (isDarkMode ? ["#1a1208", "#130e05"] : ["#ffffff", "#ffffff"])}'
  );
  content = content.replace(
    /colors=\{\s*cart\.length === 0 \? \["#2a2a2a", "#1e1e1e"\] : \["#FF9500", "#D97000"\]\s*\}/g,
    'colors={cart.length === 0 ? (isDarkMode ? ["#2a2a2a", "#1e1e1e"] : ["#d1d5db", "#9ca3af"]) : ["#FF9500", "#D97000"]}'
  );
  content = content.replace(
    /colors=\{\s*cart\.length === 0 \? \["#242424", "#1a1a1a"\] : \["#FF9500", "#D97000"\]\s*\}/g,
    'colors={cart.length === 0 ? (isDarkMode ? ["#242424", "#1a1a1a"] : ["#d1d5db", "#9ca3af"]) : ["#FF9500", "#D97000"]}'
  );

  // Add the theme toggle button next to the shift button
  const shiftButtonRegex = /(<TouchableOpacity[\s\S]*?setShiftModalType.*?<\/TouchableOpacity>)/;
  if (!content.includes("setIsDarkMode(!isDarkMode)")) {
    content = content.replace(
      shiftButtonRegex,
      `$1\n          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setIsDarkMode(!isDarkMode)}
            style={{
              marginLeft: 16,
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#e5e7eb",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {isDarkMode ? <Sun size={14} color="white" /> : <Moon size={14} color="#374151" />}
          </TouchableOpacity>`
    );
  }

  // StatusBar toggle
  content = content.replace(
    '<StatusBar style="light" />',
    '<StatusBar style={isDarkMode ? "light" : "dark"} />'
  );

  fs.writeFileSync(targetFile, content);
  console.log("Successfully applied theme injections!");
}

applyTheme();
