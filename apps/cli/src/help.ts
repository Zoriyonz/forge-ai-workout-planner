export const VERSION = "0.1.0";

export const HELP = `forge ${VERSION}: build and export workout plans from the terminal

USAGE
  forge plan --goal <text> --height <cm> --weight <kg> [options]
  forge exercises [--muscle <m>] [--equipment <list>] [--level <1-3>] [--json]
  forge --help | --version

PLAN OPTIONS
  --goal <text>         What you want, in your own words ("lose fat, 4 days a week")
  --height <cm>         Height in centimetres (required)
  --weight <kg>         Weight in kilograms (required)
  --age <years>         Age (optional, not used to pick exercises)
  --days <2-6>          Training days per week (default 3; a number in --goal wins)
  --minutes <20-90>     Session length (default 45)
  --experience <level>  beginner | intermediate | advanced (default beginner)
  --equipment <list>    Comma list: dumbbells, barbell, bench, pullup_bar, bands,
                        kettlebell, cables, machines (default: bodyweight only)
  --limits <text>       Injuries or limits, e.g. "sore knee, bad lower back"
  --waist <cm> --hips <cm>   Optional, adds waist ratios to the summary
  --format <fmt>        text (default) | markdown | json | ics
  --out <file>          Write to a file instead of stdout
  --ai                  Read the goal with Claude (needs ANTHROPIC_API_KEY)

CALENDAR OPTIONS (with --format ics)
  --start <YYYY-MM-DD>  First day to schedule from (default: today)
  --weeks <1-52>        How many weeks to repeat (default 8)
  --hour <0-23>         Local start hour (default 18)

EXAMPLES
  forge plan --goal "build muscle, bigger chest" --height 178 --weight 80 \\
    --days 4 --minutes 60 --experience intermediate --equipment dumbbells,bench
  forge plan --goal "get stronger" --height 170 --weight 65 --format ics --out forge.ics
  forge exercises --muscle glutes --equipment bands
`;
