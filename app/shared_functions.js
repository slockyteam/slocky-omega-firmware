const { exec, execSync } = require('child_process');
const merge = require('merge');
const fs = require('fs');

const SharedManager = require('./shared_manager.js');
const WebSocket = require('./web_socket.js');

/*
 * Methods
 */

module.exports.loadNetworkInfo = function(callback) {
	var results = {};
	
	var promises = [];
	
	try {
		var inet = execSync("ifconfig | grep apcli0 -A 1 | grep inet").toString().trim().split(' ');
		
		results['wlan0'] = {};
		
		if (inet.includes('inet6') == false && inet.length > 4) {
			var ipv4 = {};
			
			ipv4.ip_address = inet[1].substring(inet[1].indexOf(':') + 1);
			ipv4.broadcast = inet[3].substring(inet[3].indexOf(':') + 1);
			ipv4.mask = inet[5].substring(inet[5].indexOf(':') + 1);
			
			results['wlan0'].ipv4 = ipv4;
			
			try {
				var string = execSync("ifconfig | grep br-wlan -A 8 | grep 'RX bytes'").toString().trim();
				var splited = string.split('  ');
				
				results['wlan0'].rx_bytes = splited[0].substring(splited[0].indexOf(':') + 1);
				results['wlan0'].tx_bytes = splited[1].substring(splited[1].indexOf(':') + 1);
			} catch (error) {
			}
			
			try {
				var string = execSync('ifconfig | grep br-wlan -A 1 | grep inet').toString().trim();
				var splited = string.split(' ');
				
				if (splited.length > 4) {
					results['wlan0']['access_point'] = {};
					
					var netData = {};
					
					netData.ip_address = splited[1].substring(splited[1].indexOf(':') + 1);
					netData.broadcast = splited[3].substring(splited[3].indexOf(':') + 1);
					netData.mask = splited[5].substring(splited[5].indexOf(':') + 1);
					
					results['wlan0']['access_point'] = netData;
				}
			} catch (error) {
			}
		}
	} catch (error) {
	}
	
	try {
		var inet = execSync('ifconfig | grep 3g-3g -A 1 | grep inet').toString().trim().split(' ');
		
		results['ppp0'] = {};
		
		if (inet.includes('inet6') == false && inet.length > 4) {
			var ipv4 = {};
			
			ipv4.ip_address = inet[1].substring(inet[1].indexOf(':') + 1);
			ipv4.broadcast = inet[3].substring(inet[3].indexOf(':') + 1);
			ipv4.mask = inet[5].substring(inet[5].indexOf(':') + 1);
			
			results['ppp0'].ipv4 = ipv4;
			
			try {
				var string = execSync("ifconfig | grep 3g-3g -A 8 | grep 'RX bytes'").toString().trim();
				var splited = string.split('  ');
				
				results['ppp0'].rx_bytes = splited[0].substring(splited[0].indexOf(':') + 1);
				results['ppp0'].tx_bytes = splited[1].substring(splited[1].indexOf(':') + 1);
			} catch (error) {
			}
		}
	} catch (error) {
	}
	
	if (promises.length > 0) {
		Promise.all(promises).then(function(values) {
			return callback(null, results);
		});
	} else {
		return callback(null, results);
	}
};

module.exports.loadWifiAccessPointSettings = function(callback) {
	try {
		
	} catch (error) {
		return callback(error, null);
	}
};

module.exports.loadCellularSettings = function(callback) {
	try {
		
	} catch (error) {
		return callback(error, null);
	}
};

module.exports.saveWifiAccessPointSettings = function(data, callback) {
	if (data != null) {
		
	} else {
		return callback('missing_parameters', null);
	}
};

module.exports.saveCellularSettings = function(data, callback) {
	if (data != null) {
		
	} else {
		return callback('missing_parameters', null);
	}
};

module.exports.cellularOn = function() {
	try {
		if (SharedManager.deviceSettings.hardware.includes('Raspberry') == true) {
			if (SharedManager.deviceSettings.lte_modem != null) {
				exec('pon', (error, stdout, stderr) => {
					if (stderr) {
						return callback(stderr, null);
					} else {
						return callback(null, null);
					}
				});
			} else {
				return callback('lte_modem_not_installer', null);
			}
		} else {
			return callback('unknown_hardware', null);
		}
	} catch (error) {
		return callback(error, null);
	}
};

module.exports.cellularOff = function() {
	try {
		
	} catch (error) {
		return callback(error, null);
	}
};

module.exports.saveDeviceSettings = function(data, callback) {
	if (data != null) {
		var promises = [];
		var responseError = null;
				
		if (responseError == null) {
			SharedManager.writeDeviceSettings(data);
		}
		
		if (promises.length > 0) {
			Promise.all(promises).then(function(values) {
				return callback(responseError, null);
			});
		} else {
			return callback(responseError, null);
		}
	} else {
		return callback('missing_parameters', null);
	}
};

module.exports.rebootDevice = function() {
	function reboot() {
		WebSocket.closeConnection();
		
		if (SharedManager.deviceSettings.services != null) {
			SharedManager.deviceSettings.services.forEach(function(service) {
				if (fs.existsSync(SharedManager.servicesFolderPath + '/' + service.service_folder + '/process.json')) {
					const rawdata = fs.readFileSync(SharedManager.servicesFolderPath + '/' + service.service_folder + '/process.json');
					
					try {
						const json = JSON.parse(rawdata);
						
						execSync('kill ' + json.pid);
					} catch (error) {
					}
				}
			});
		}
		
		execSync('reboot');
	};
	
	reboot();
};

module.exports.wifiScan = function(callback) {
	exec("ubus call onion wifi-scan '{\"device\":\"ra0\"}'", (error, stdout, stderr) => {
		var networks = JSON.parse(stdout).results;
		
		function calculateRssiFromQuality(quality) {
			const min = 0;
			const max = 100;
			
			return (((quality / 100) * (min - max)) * -1);
		};
		
		var results = networks.map(function(object) {
			var data =  {
				address: object.bssid,
				ssid: object.ssid,
				channel: object.channel,
				security: object.encryption,
				rssi: object.signalStrength,
				quality: calculateRssiFromQuality(object.signalStrength)
			};

			return data;
		});
		
		return callback(null, results);
	});
};

module.exports.loadWifiConnections = function(callback) {
	/*if (SharedManager.deviceSettings.hardware.includes('Raspberry') == true) {
		require('./pi-wifi.js').listNetworks(function(error, networks) {
			require('./pi-wifi.js').status('wlan0', function(error, connectedNetwork) {
				var results = [];
				
				if (networks != null) {
					networks.forEach(function(network) {
						network.id = network.network_id;
						delete network.network_id;
						
						if (connectedNetwork != null && network.id == connectedNetwork.id) {
							network.connected = true;
							
							merge(network, connectedNetwork);
							
							network.ip_address = network.ip;
							delete network.ip;
						
							if (network.frequency != null) {
								network.frequency = (network.frequency / 1000);
							}
						} else {
							network.connected = false;
						}
					});
					
					results = networks;
				}
				
				return callback(null, results);
			});
		});
	} else {
		return callback('unknown_hardware', null);
	}*/
};

module.exports.deleteWifiConnection = function(data, callback) {
	/*if (SharedManager.deviceSettings.hardware.includes('Raspberry') == true) {
		if (data.id != null) {
			exec("sudo wpa_cli remove_network " + data.id.toString(), (error, stdout, stderr) => {
				exec("sudo wpa_cli -i wlan0 remove_network " + data.id.toString(), (error, stdout, stderr) => {
					if (stderr) {
						return callback(stderr, null);
					} else {
						exec("sudo wpa_cli save_config", (error, stdout, stderr) => {
							return callback(null, null);
						});
					}
				});
			});
		} else {
			return callback('missing_parameters', null);
		}
	} else {
		return callback('unknown_hardware', null);
	}*/
};

module.exports.connectWifiConnection = function(data, callback) {
	/*if (SharedManager.deviceSettings.hardware.includes('Raspberry') == true) {
		if (data != null) {
			function disableWifiAccessPoint(callback) {
				exec("sudo systemctl is-enabled hostapd", (error, stdout, stderr) => {
					if (stdout.includes('enabled') && execSync("cat /etc/hostapd/hostapd.conf | grep interface | cut -d '=' -f 2 | head -n 1").toString().includes('wlan0')) {
						exec("sudo service hostapd stop", (error, stdout, stderr) => {
							exec("sudo systemctl disable hostapd", (error, stdout, stderr) => {
								var file = execSync('cat /etc/dhcpcd.conf').toString();
								
								var newWlanObject = "";
								newWlanObject += "#WLAN0_START\n";
								newWlanObject += "#interface wlan0\n";
								newWlanObject += "#static ip_address=192.168.4.1/24\n";
								newWlanObject += "#nohook wpa_supplicant\n";
								newWlanObject += "#WLAN0_END";
								
								file = file.replace(file.substring(file.indexOf('#WLAN0_START'), file.indexOf('#WLAN0_END') + '#WLAN0_END'.length), newWlanObject);
								
								fs.writeFileSync('/etc/dhcpcd.conf', file);
										
								exec("sudo systemctl daemon-reload", (error, stdout, stderr) => {
									exec("sudo systemctl restart dhcpcd", (error, stdout, stderr) => {
										callback();
									});
								});
							});
						});
					}
				});
			}
		
			if (data.id != null) {
				disableWifiAccessPoint(function() {
					require('./pi-wifi.js').connectToId(data.id, function(error) {
						if (error) {
							return callback(error.message, null);
						} else {
							disableAccessPoint();
							
							return callback(null, null);
						}
					});
				});
			} else if (data.ssid != null && data.password != null && data.username == null) {
				disableWifiAccessPoint(function() {
					require('./pi-wifi.js').connect(data.ssid, data.password, function(error) {
						if (error) {
							return callback(error.message, null);
						} else {
							return callback(null, null);
						}
					});
				});
			} else if (data.ssid != null && data.password != null && data.username != null) {
				disableWifiAccessPoint(function() {
					require('./pi-wifi.js').connectEAP(data.ssid, data.username, data.password, function(error) {
						if (error) {
							return callback(error.message, null);
						} else {
							return callback(null, null);
						}
					});
				});
			} else if (data.ssid != null) {
				disableWifiAccessPoint(function() {
					require('./pi-wifi.js').connectOpen(data.ssid, function(error) {
						if (error) {
							return callback(error.message, null);
						} else {
							return callback(null, null);
						}
					});
				});
			} else {
				return callback('missing_parameters', null);
			}
		} else {
			return callback('missing_parameters', null);
		}
	} else {
		return callback('unknown_hardware', null);
	}*/
};

module.exports.disconnectWifiConnection = function(data, callback) {
	/*if (SharedManager.deviceSettings.hardware.includes('Raspberry') == true) {
		exec("sudo wpa_cli -i wlan0 disable_network " + json.data.id.toString(), (error, stdout, stderr) => {
			if (stderr) {
				return callback(stderr, null);
			} else {
				exec("sudo wpa_cli save_config", (error, stdout, stderr) => {
					return callback(null, null);
				});
			}
		});
	} else {
		return callback('unknown_hardware', null);
	}*/
};

module.exports.loadDeviceSettings = function(callback) {
	var deviceSettings = SharedManager.deviceSettings;
	
	callback(null, deviceSettings);
};
