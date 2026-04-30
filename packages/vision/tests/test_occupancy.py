from src.pipelines.occupancy import analyze_occupancy


def test_occupancy_placeholder() -> None:
    result = analyze_occupancy("demo.mp4")
    assert "resolved_path" in result
    assert "estimated_people_count" in result