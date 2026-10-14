<?php
class modLayoutDemo
{
	public function __construct()
	{
		$this->version = '1.2.3';
		// $this->depends = array('modCommented');
		$this->depends = array(
			'modFacture',
			'modSociete', 'modFooBar'
		);
		$this->langfiles = array("layoutdemo@layoutdemo");
	}
}
