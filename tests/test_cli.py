from click.testing import CliRunner


def test_cli_importa_y_muestra_ayuda():
    from rmd_automation.cli import cli

    r = CliRunner().invoke(cli, ["cambios", "aplicar", "--help"])
    assert r.exit_code == 0 and "--matriz" in r.output and "--referencia" in r.output
