import './index.scss';
import React from 'react';
import ReactDOM from 'react-dom';
import MasterPlaylist from './components/MasterPlaylist';
import Media from './components/Media';
import MediaBrowser from './components/MediaBrowser';
import Panel from './components/Panel';
import Playlist from './components/Playlist';
import Splitter from './components/Splitter';
import items from '../data';

function App() {
    return (
        <main>
            <Splitter orientation="horizontal" primaryIndex={0} secondaryInitialSize={300}> 
                <Splitter orientation="vertical" primaryIndex={1} secondaryInitialSize={120}>                
                    <Panel>
                        <Media src="/media/test.mp3" />
                    </Panel>
                    <Splitter orientation="horizontal" primaryIndex={1} secondaryInitialSize={200}>                
                        <Panel>
                            <MediaBrowser />
                        </Panel>
                        <Panel>
                            <Playlist items={items} />
                        </Panel>
                    </Splitter>
                </Splitter>
                <Splitter orientation="vertical" primaryIndex={0} secondaryInitialSize={169}>                
                    <Panel>
                        <MasterPlaylist />
                    </Panel>
                    <Panel>
                        <p>Visual output</p>
                    </Panel>
                </Splitter>
            </Splitter>
        </main>
    );
}

ReactDOM.render(
    <App />, document.getElementById('react-root')
);
