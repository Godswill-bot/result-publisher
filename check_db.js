const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

const env = fs.readFileSync(".env.local", "utf8");
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);

if (!urlMatch || !keyMatch) {
    console.error("Missing credentials");
    process.exit(1);
}

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
    // 1. Students count and first 10 matric numbers
    const { count: studentCount, data: studentData, error: studentError } = await supabase
        .from("students")
        .select("matric_number", { count: "exact" })
        .limit(10);
    
    if (studentError) {
        console.error("Students Error:", studentError.message);
    } else {
        console.log("Students Count:", studentCount);
        console.log("First 10 Students Matric:", studentData.map(s => s.matric_number).join(", "));
    }

    // 2. Results count and first 10 matric numbers with delivery_state
    const { count: resultsCount, data: resultsData, error: resultsError } = await supabase
        .from("results")
        .select("matric_number, delivery_state", { count: "exact" })
        .limit(10);

    if (resultsError) {
        console.error("Results Error:", resultsError.message);
    } else {
        console.log("Results Count:", resultsCount);
        console.log("First 10 Results (Matric: State):", resultsData.map(r => `${r.matric_number}: ${r.delivery_state}`).join(", "));
    }

    // 3 & 4. Whether matric 22010306034 exists in students and results
    const { data: sSearch } = await supabase.from("students").select("matric_number").eq("matric_number", "22010306034").single();
    const { data: rSearch } = await supabase.from("results").select("matric_number").eq("matric_number", "22010306034").limit(1);

    console.log("Matric 22010306034 exists in students:", !!sSearch);
    console.log("Matric 22010306034 exists in results:", rSearch && rSearch.length > 0);
}

run();
