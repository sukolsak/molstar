/**
 * Copyright (c) 2019 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @author David Sehnal <david.sehnal@gmail.com>
 */

import * as React from 'react';
import { ParamDefinition as PD } from '../../mol-util/param-definition';
import { ParameterControls } from '../controls/parameters';
import { PluginUIComponent } from '../base';
import { Icon } from '../controls/common';
import { debounceTime } from 'rxjs/operators';
import { Subject } from 'rxjs';

interface ImageControlsState {
    showPreview: boolean

    size: 'canvas' | 'custom'
    width: number
    height: number

    isDisabled: boolean
}

export class DownloadScreenshotControls extends PluginUIComponent<{ close: () => void }, ImageControlsState> {
    state: ImageControlsState = {
        showPreview: true,
        ...this.plugin.helpers.viewportScreenshot?.size,
        isDisabled: false
    } as ImageControlsState

    private imgRef = React.createRef<HTMLImageElement>()
    private updateQueue = new Subject();

    get imagePass() {
        return this.plugin.helpers.viewportScreenshot!.imagePass;
    }

    private preview = async () => {
        if (!this.imgRef.current) return;
        this.imgRef.current!.src = await this.plugin.helpers.viewportScreenshot!.imageData();
    }

    private download = () => {
        this.plugin.helpers.viewportScreenshot?.download();
        this.props.close();
    }

    private handlePreview() {
        if (this.state.showPreview) {
            this.preview()
        }
    }

    componentDidUpdate() {
        this.updateQueue.next();
    }

    componentDidMount() {
        if (!this.plugin.canvas3d) return;

        this.subscribe(debounceTime(250)(this.updateQueue), () => this.handlePreview());

        this.subscribe(this.plugin.events.canvas3d.settingsUpdated, () => {
            this.imagePass.setProps({
                multiSample: { mode: 'on', sampleLevel: 2 },
                postprocessing: this.plugin.canvas3d?.props.postprocessing
            })
            this.updateQueue.next();
        })

        this.subscribe(debounceTime(250)(this.plugin.canvas3d.didDraw), () => {
            if (this.state.isDisabled) return;
            this.updateQueue.next();
        })

        this.subscribe(this.plugin.state.dataState.events.isUpdating, v => {
            this.setState({ isDisabled: v })
            if (!v) this.updateQueue.next();
        })

        this.handlePreview();
    }

    private setProps = (p: { param: PD.Base<any>, name: string, value: any }) => {
        if (p.name === 'size') {
            if (p.value.name === 'custom') {
                this.plugin.helpers.viewportScreenshot!.size.type = 'custom';
                this.plugin.helpers.viewportScreenshot!.size.width = p.value.params.width;
                this.plugin.helpers.viewportScreenshot!.size.height = p.value.params.height;
                this.setState({ size: p.value.name, width: p.value.params.width, height: p.value.params.height })
            } else {
                this.plugin.helpers.viewportScreenshot!.size.type = 'canvas';
                this.setState({ size: p.value.name })
            }
        }
    }

    render() {
        return <div>
            <div className='msp-image-preview'>
                <img ref={this.imgRef} /><br />
                <span>Right-click the image to Copy.</span>
            </div>
            <div className='msp-control-row'>
                <button className='msp-btn msp-btn-block' onClick={this.download} disabled={this.state.isDisabled}><Icon name='download' /> Download</button>
            </div>
            <ParameterControls params={this.plugin.helpers.viewportScreenshot!.params} values={this.plugin.helpers.viewportScreenshot!.values} onChange={this.setProps} isDisabled={this.state.isDisabled} />
        </div>
    }
}